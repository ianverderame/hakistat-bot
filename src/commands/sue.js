const supabase = require('../utils/supabase');

const VOTE_DURATION_MS = 60 * 1000; // 5 minutes
const REQUIRED_VOTES = 7;
const GUILTY_EMOJI = 'emoji_2';
const NOT_GUILTY_EMOJI = 'emoji_1';
const GUILTY_EMOJI_REACT = '<:emoji_2:1395041344971604090>';
const NOT_GUILTY_EMOJI_REACT = '<:emoji_1:1395041317138202694>';

// Track active lawsuits to prevent duplicates
const activeLawsuits = new Set();

module.exports = {
    name: 'sue',
    description: 'Sue another user and let the jury decide!',
    usage: '!sue <username> <points> <reason>',

    async execute(message, args) {
        if (args.length < 3) {
            return message.channel.send('Usage: `!sue <username> <points> <reason>`');
        }

        const targetUsername = args[0];
        const points = parseInt(args[1]);
        const reason = args.slice(2).join(' ');

        if (isNaN(points) || points <= 0) {
            return message.channel.send('Please provide a valid point amount.');
        }

        const discordId = message.author.id;

        try {
            // Fetch plaintiff
            const { data: plaintiff, error: plaintiffError } = await supabase
                .from('profiles')
                .select('username, total_haki_points, user_id, discord_id')
                .eq('discord_id', discordId)
                .maybeSingle();

            if (plaintiffError || !plaintiff) {
                return message.channel.send('No profile linked to your Discord account. Use `!link <username>` to link.');
            }

            // Fetch defendant
            const { data: defendant, error: defendantError } = await supabase
                .from('profiles')
                .select('username, total_haki_points, user_id, discord_id')
                .eq('username', targetUsername)
                .maybeSingle();

            if (defendantError || !defendant) {
                return message.channel.send(`No profile found with username "${targetUsername}".`);
            }

            if (plaintiff.discord_id === defendant.discord_id) {
                return message.channel.send("You can't sue yourself.");
            }

            // Prevent duplicate lawsuits
            const caseKey = `${plaintiff.user_id}-${defendant.user_id}`;
            if (activeLawsuits.has(caseKey)) {
                return message.channel.send(`You already have an active lawsuit against **${defendant.username}**.`);
            }
            activeLawsuits.add(caseKey);

            // Send lawsuit message
            const caseMsg = await message.channel.send(
                `⚖️ **LAWSUIT FILED**\n\n` +
                `**Plaintiff:** ${plaintiff.username}\n` +
                `**Defendant:** ${defendant.username}\n` +
                `**Amount:** ${points} haki points\n` +
                `**Reason:** ${reason}\n\n` +
                `The jury has **5 minutes** to vote. At least **${REQUIRED_VOTES}** votes are required for a verdict.\n` +
                `${GUILTY_EMOJI_REACT} — Guilty | ${NOT_GUILTY_EMOJI_REACT} — Not Guilty`
            );

            await caseMsg.react(GUILTY_EMOJI_REACT);
            await caseMsg.react(NOT_GUILTY_EMOJI_REACT);

            // Collect reactions
            const filter = (reaction, user) => {
                return (
                    [GUILTY_EMOJI, NOT_GUILTY_EMOJI].includes(reaction.emoji.name) &&
                    user.id !== plaintiff.discord_id &&
                    user.id !== defendant.discord_id &&
                    !user.bot
                );
            };

            const collector = caseMsg.createReactionCollector({ filter, time: VOTE_DURATION_MS });

            const votedUsers = new Set();
            collector.on('collect', (reaction, user) => {
                if (votedUsers.has(user.id)) return; // silently ignore duplicate votes
                votedUsers.add(user.id);
            });

            collector.on('end', async (collected) => {
                activeLawsuits.delete(caseKey);

                const guiltyVotes = collected.get(GUILTY_EMOJI_REACT)?.count - 1 ?? 0; // subtract bot's initial reaction
                const notGuiltyVotes = collected.get(NOT_GUILTY_EMOJI_REACT)?.count - 1 ?? 0;
                const totalVotes = guiltyVotes + notGuiltyVotes;

                if (totalVotes < REQUIRED_VOTES) {
                    return message.channel.send(
                        `⚖️ **CASE DISMISSED**\n\nNot enough jurors voted. (${totalVotes}/${REQUIRED_VOTES} required)\nThe case against **${defendant.username}** has been dismissed.`
                    );
                }

                if (guiltyVotes > notGuiltyVotes) {
                    // Defendant is guilty — transfer points
                    const { error: plaintiffUpdateError } = await supabase
                        .from('profiles')
                        .update({ total_haki_points: plaintiff.total_haki_points + points })
                        .eq('user_id', plaintiff.user_id);

                    const { error: defendantUpdateError } = await supabase
                        .from('profiles')
                        .update({ total_haki_points: defendant.total_haki_points - points })
                        .eq('user_id', defendant.user_id);

                    if (plaintiffUpdateError || defendantUpdateError) {
                        return message.channel.send('Error processing the verdict.');
                    }

                    // Log transactions
                    await supabase.from('haki_point_transactions').insert([
                        {
                            user_id: plaintiff.user_id,
                            points_delta: points,
                            reason: `Won lawsuit against ${defendant.username}: ${reason}`,
                            awarded_by: 'hakistat bot',
                            source: 'lawsuit'
                        },
                        {
                            user_id: defendant.user_id,
                            points_delta: -points,
                            reason: `Lost lawsuit to ${plaintiff.username}: ${reason}`,
                            awarded_by: 'hakistat bot',
                            source: 'lawsuit'
                        }
                    ]);

                    message.channel.send(
                        `⚖️ **VERDICT: GUILTY**\n\n` +
                        `**${defendant.username}** has been found guilty! (${guiltyVotes} vs ${notGuiltyVotes})\n` +
                        `**${points}** haki points have been transferred to **${plaintiff.username}**.`
                    );
                } else {
                    message.channel.send(
                        `⚖️ **VERDICT: NOT GUILTY**\n\n` +
                        `**${defendant.username}** has been found not guilty! (${notGuiltyVotes} vs ${guiltyVotes})\n` +
                        `No points have been transferred.`
                    );
                }
            });

        } catch (err) {
            console.error(err);
            message.channel.send('There was an error processing your request.');
        }
    }
};