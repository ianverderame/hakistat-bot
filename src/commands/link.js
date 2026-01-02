const supabase = require('../utils/supabase');

module.exports = {
    name: 'link',
    description: 'Link your Discord account to your profile',
    async execute(message, args) {
        const discordId = message.author.id;          // Permanent Discord ID
        const discordUsername = message.author.username; // Optional, for display

        // User must provide their profile username to link
        const profileName = args[0];
        if (!profileName) {
            return message.channel.send(
                'Please provide your profile username. Example: `!link Ian`'
            );
        }

        // Fetch the profile by username
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('user_id, username, discord_id')
            .eq('username', profileName)
            .maybeSingle(); // returns null if no row found

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
            .select(); // return updated row

        if (error) {
            console.error(error);
            return message.channel.send('Failed to link your Discord account.');
        }

        message.channel.send(
            `Successfully linked your Discord account to profile "${profile.username}".`
        );
    }
};
