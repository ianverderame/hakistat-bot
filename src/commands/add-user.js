const supabase = require("../utils/supabase");

module.exports = {
    name: 'add-user',
    description: 'Add a user to the database',
    async execute(message, args) {
        let data;

        try {
          const profileName = args[0];
          if (!profileName) {
            return message.channel.send(
              "Please provide a username to add. Example: `!add-user Ian`"
            );
          }

          // Fetch the profile by username
          const { data: profile, error: fetchError } = await supabase
            .from("profiles")
            .select("user_id, username, discord_id")
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


          const startingHakiPoints = args[1] ? parseInt(args[1], 10) : 0;
          await supabase.from("profiles").insert({
            username: profileName,
            total_haki_points: startingHakiPoints,
          });
          
          message.channel.send(`Successfully added user "${profileName}" with ${startingHakiPoints} Haki points.`);

        } catch (err) {
            console.error(err);
            message.channel.send('Unable to add User');
        }
    }

}
