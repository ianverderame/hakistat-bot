const supabase = require('../utils/supabase');

const NEGATIVE_BALANCE_WIN_CHANCE = 0.05;
const NEGATIVE_BALANCE_MAX_BET = 10; // max bet for users with negative points
const DEFAULT_WIN_CHANCE = 0.5;

module.exports = {
    name: 'gamble',
    description: 'Gamble your haki points on a coinflip!',
    usage: '!gamble <points>',

    async execute(message, args) {
        const discordId = message.author.id;

        const bet = parseInt(args[0]);
        if (!args[0] || isNaN(bet) || bet <= 0) {
            return message.channel.send('Please provide a valid amount to gamble. Usage: `!gamble <points>`');
        }

        try {
            const { data: userData, error } = await supabase
                .from('profiles')
                .select('username, total_haki_points, user_id')
                .eq('discord_id', discordId)
                .maybeSingle();

            if (error) {
                console.error(error);
                return message.channel.send('Error fetching your profile.');
            }

            if (!userData) {
                return message.channel.send('No profile linked to your Discord account. Use `!link <username>` to link.');
            }

            const currentPoints = userData.total_haki_points ?? 0;
            const isNegative = currentPoints <= 0;

            if (!isNegative){
                // Check daily profit cap
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const { data: todayLogs, error: logsError } = await supabase
                    .from('haki_point_transactions')
                    .select('points_delta')
                    .eq('user_id', userData.user_id)
                    .eq('source', 'gamble')
                    .gte('created_at', todayStart.toISOString());

                if (logsError) {
                    console.error(logsError);
                    return message.channel.send('Error checking daily profit limit.');
                }

                const todayProfit = todayLogs.reduce((sum, log) => sum + log.points_delta, 0);
                const startingBalance = currentPoints - todayProfit;
                const dailyCap = Math.floor(startingBalance * 0.5);

                if (todayProfit >= dailyCap) {
                    return message.channel.send(
                        `⚠️ You've reached your daily profit cap of **${dailyCap}** haki points (50% of your starting balance). Come back tomorrow!`
                    );
                }
            }

            // Apply restrictions for users with negative balance
            if (isNegative && bet > NEGATIVE_BALANCE_MAX_BET) {
                return message.channel.send(
                    `⚠️ Users with a negative balance can only bet up to **${NEGATIVE_BALANCE_MAX_BET}** haki points.`
                );
            }

            if (!isNegative && bet > currentPoints) {
                return message.channel.send(
                    `You don't have enough haki points! You only have **${currentPoints}** points.`
                );
            }

            const winChance = isNegative ? NEGATIVE_BALANCE_WIN_CHANCE : DEFAULT_WIN_CHANCE;
            const won = Math.random() < winChance;
            const newPoints = won ? currentPoints + bet : currentPoints - bet;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ total_haki_points: newPoints })
                .eq('discord_id', discordId);

            if (updateError) {
                console.error(updateError);
                return message.channel.send('Error updating your haki points.');
            }

            if (won) {
                message.channel.send(
                    `🪙 **Coinflip — WIN!**\n${userData.username} gambled **${bet}** points and won! (+${bet})\nNew balance: **${newPoints}** haki points.`
                );
            } else {
                message.channel.send(
                    `🪙 **Coinflip — LOSS!**\n${userData.username} gambled **${bet}** points and lost. (-${bet})\nNew balance: **${newPoints}** haki points.`
                );
            }
                // Log transaction
            const { error: logError } = await supabase
                .from('haki_point_transactions')
                .insert({
                    user_id: userData.user_id,
                    points_delta: won ? bet : -bet,
                    reason: `Coinflip — ${won ? 'Win' : 'Loss'} (bet ${bet})`,
                    awarded_by: 'hakistat bot',
                    source: 'gamble'
                });

            if (logError) {
                console.error(logError);
                return message.channel.send('Points were updated but failed to log transaction.');
            }

        } catch (err) {
            console.error(err);
            message.channel.send('There was an error processing your request.');
        }
    }
};