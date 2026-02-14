const supabase = require("../utils/supabase");

module.exports = {
    name: 'create',
    description: 'Add a new user to the database',
    usage: '!create <username>',

    async execute(message, args) {
        try {
          const profileName = args[0];
          const discordId = message.author.id;
          if (!profileName) {
            return message.channel.send(
              "Please provide a username to add. Example: `!create dirtyverdy`"
            );
          }

          // Fetch the profile by username
          const { data: profile, error: fetchError } = await supabase
            .from("profiles")
            .select("username")
            .eq("username", profileName)
            .maybeSingle(); // returns null if no row found

          if (fetchError) {
            console.error(fetchError);
            return message.channel.send(
              "Error checking your profile in the database."
            );
          }

          if (profile) {
            return message.channel.send(
              `There is already a profile with username "${profileName}".`
            );
          }

          const { data: userData, error } = await supabase
            .from("profiles")
            .select("discord_id")
            .eq("discord_id", discordId)
            .maybeSingle();

          if (error) {
            console.error(error);
            return message.channel.send(
              "Error checking your Discord link in the database."
            );
          }

          if (userData) {
            return message.channel.send(
              `A profile is already linked to this Discord account. Run !check to see your Haki points.`
            );
          }

          const startingHakiPoints = 5;
          await supabase.from("profiles").insert({
            username: profileName,
            total_haki_points: startingHakiPoints,
            discord_id: discordId
          });

          message.channel.send(
            `Successfully added user "${profileName}" with ${startingHakiPoints} Haki points.`
          );
        } catch (err) {
            console.error(err);
            message.channel.send('Unable to create User');
        }
    }

}
