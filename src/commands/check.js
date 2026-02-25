const supabase = require('../utils/supabase');

module.exports = {
    name: 'check',
    description: 'Check your or another user’s Haki points. If no username provided, your points will be displayed',
    usage: '!check <optional username>',

    async execute(message, args) {
        let data;
        const leaderboardUrl = "https://hakistat.com/points";

        try {
            const {targetCol, target} = args.length > 0 ? {targetCol: 'username', target: args[0]} : {tartargetColgetName: 'discord_id', target: message.author.id};
            const { data: userData, error } = await supabase
                .from('ranked_view')
                .select('username, total_haki_points, rank, row_number')
                .eq(targetCol, target)
                .maybeSingle()
                
                if (error) {
                  console.error(error);
                  return message.channel.send(
                    `Error fetching Haki points for ${usernameArg}.`,
                  );
                }

                if (!userData) {
                  return message.channel.send(
                    `No profile found with username "${usernameArg}".`,
                  );
                }

            // Display points
            const points = userData.total_haki_points ?? 0;
            message.channel.send(`${userData.username} has ${points} Haki points. Ranked ${userData.rank} and is # ${userData.row_number} on the [leaderboard](${leaderboardUrl})`);
        } catch (err) {
            console.error(err);
            message.channel.send('There was an error processing your request.');
        }
    }
};
