const supabase = require('../utils/supabase');

module.exports = {
    name: 'link',
    description: 'Link your Discord account to your existing profile. Check [the leaderboard](https://hakistat.com/points) to see if you\'re already on the list. If you are not, you will need to use the !create command',
    usage: '!link <your username>',

    async execute(message, args) {
        const discordId = message.author.id;          // Permanent Discord ID
        // const discordUsername = message.author.username; // Optional, for display

        const profileName = args[0];
        if (!profileName) {
            return message.channel.send(
                'Please provide your profile username. Example: `!link dirtyverdy`'
            );
        }

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('user_id, username, discord_id')
            .eq('username', profileName)
            .maybeSingle();

        if (fetchError) {
            console.error(fetchError);
            return message.channel.send('Error checking your profile in the database.');
        }

        if (!profile) {
            return message.channel.send(`No profile found with username "${profileName}".`);
        }

        if (profile.discord_id) {
            return message.channel.send(
                `This profile is already linked to a Discord account.`
            );
        }

        // Link the Discord ID
        const { data, error } = await supabase
            .from('profiles')
            .update({ discord_id: discordId })
            .eq('user_id', profile.user_id)
            .select();

        if (error) {
            console.error(error);
            return message.channel.send('Failed to link your Discord account.');
        }

        message.channel.send(
            `Successfully linked your Discord account to profile "${profile.username}".`
        );
    }
};
