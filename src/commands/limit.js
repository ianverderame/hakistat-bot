const supabase = require('../utils/supabase');

module.exports = {
    name: 'limit',
    description: 'Check your daily gambling profit limit.',
    usage: '!limit <optional username>',

    async execute(message, args) {
        const discordId = message.author.id;

        try {
            let userData;

            if (args.length > 0) {
                const usernameArg = args[0];
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, total_haki_points, user_id')
                    .eq('username', usernameArg)
                    .maybeSingle();

                if (error) {
                    console.error(error);
                    return message.channel.send(`Error fetching profile for ${usernameArg}.`);
                }

                if (!data) {
                    return message.channel.send(`No profile found with username "${usernameArg}".`);
                }

                userData = data;
            } else {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, total_haki_points, user_id')
                    .eq('discord_id', discordId)
                    .maybeSingle();

                if (error) {
                    console.error(error);
                    return message.channel.send('Error fetching your profile.');
                }

                if (!data) {
                    return message.channel.send('No profile linked to your Discord account. Use `!link <username>` to link.');
                }

                userData = data;
            }

            const currentPoints = userData.total_haki_points ?? 0;

            if (currentPoints <= 0) {
                return message.channel.send(
                    `⚠️ **${userData.username}** has a negative balance. They can bet up to **10** haki points per gamble.`
                );
            }

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: todayGambleLogs, error: gambleLogsError } = await supabase
                .from('haki_point_transactions')
                .select('points_delta')
                .eq('user_id', userData.user_id)
                .eq('source', 'gamble')
                .gte('created_at', todayStart.toISOString());

            const { data: todayReactionLogs, error: reactionLogsError } = await supabase
                .from('haki_point_transactions')
                .select('points_delta')
                .eq('user_id', userData.user_id)
                .eq('source', 'discord_reaction')
                .gte('created_at', todayStart.toISOString());

            if (gambleLogsError || reactionLogsError) {
                console.error(gambleLogsError || reactionLogsError);
                return message.channel.send('Error fetching transaction history.');
            }

            const todayGambleProfit = todayGambleLogs.reduce((sum, log) => sum + log.points_delta, 0);
            const todayReactionGains = todayReactionLogs.reduce((sum, log) => sum + log.points_delta, 0);

            const startingBalance = currentPoints - todayGambleProfit - todayReactionGains;
            const dailyCap = Math.floor(startingBalance * 0.5);
            const remaining = Math.max(0, dailyCap - todayGambleProfit);

            message.channel.send(
                `📊 **${userData.username}'s Gambling Limit**\n` +
                `Starting balance today: **${startingBalance}** haki points\n` +
                `Daily profit cap: **${dailyCap}** haki points\n` +
                `Gamble profit so far today: **${todayGambleProfit}** haki points\n` +
                `Remaining: **${remaining}** haki points`
            );

        } catch (err) {
            console.error(err);
            message.channel.send('There was an error processing your request.');
        }
    }
};