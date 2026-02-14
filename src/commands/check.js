const supabase = require('../utils/supabase');

module.exports = {
    name: 'check',
    description: 'Check your or another user’s Haki points. If no username provided, your points will be displayed',
    usage: '!check <optional username>',

    async execute(message, args) {
        let data;

        try {
            if (args.length > 0) {
                // Username provided
                const usernameArg = args[0];

                const { data: userData, error } = await supabase
                    .from('profiles')
                    .select('username, total_haki_points')
                    .eq('username', usernameArg)
                    .maybeSingle();

                if (error) {
                    console.error(error);
                    return message.channel.send(`Error fetching Haki points for ${usernameArg}.`);
                }

                if (!userData) {
                    return message.channel.send(`No profile found with username "${usernameArg}".`);
                }

                data = userData;
            } else {
                // No username provided, use message author
                const discordId = message.author.id;

                const { data: userData, error } = await supabase
                    .from('profiles')
                    .select('username, total_haki_points')
                    .eq('discord_id', discordId)
                    .maybeSingle();

                if (error) {
                    console.error(error);
                    return message.channel.send(
                        `Error fetching Haki points for ${message.author.username}.`
                    );
                }

                if (!userData) {
                    return message.channel.send(
                        `No profile linked to your Discord account. Use !link <username> to link.`
                    );
                }

                data = userData;
            }

            // Display points
            const points = data.total_haki_points ?? 0;
            message.channel.send(`${data.username} has ${points} Haki points.`);
        } catch (err) {
            console.error(err);
            message.channel.send('There was an error processing your request.');
        }
    }
};
