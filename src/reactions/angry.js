const emojis = require("../utils/emojis");
const hakiID = "1069683217420005518";

module.exports = {
  name: "Angrycat points",

  executeAdd: async (reaction, user, supabase) => {
    if (reaction.emoji.id !== emojis.angrycatEmojiID) return;
    
    if (user.id !== hakiID) return;

    const messageAuthor = reaction.message.author;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, total_haki_points")
      .eq("discord_id", messageAuthor.id)
      .maybeSingle();

    if (error) return console.error(error);
    if (!profile)
      return console.log(`No profile found for ${messageAuthor.username}`);

    const currentTotal = profile.total_haki_points ?? 0;

    await supabase.from("haki_point_transactions").insert({
      user_id: profile.user_id,
      points_delta: -50,
      reason: "-50 haki point. got angrycatted",
      awarded_by: user.username,
      source: "discord_reaction",
    });

    await supabase
      .from("profiles")
      .update({ total_haki_points: currentTotal - 50 })
      .eq("user_id", profile.user_id);

    console.log(
      `-50 Haki to ${messageAuthor.username} from ${user.username} via ${reaction.emoji.name}`,
    );
  },

  executeRemove: async (reaction, user, supabase) => {
    if (reaction.emoji.id !== emojis.angrycatEmojiID) return;

    if (user.id !== hakiID) return;

    const messageAuthor = reaction.message.author;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, total_haki_points")
      .eq("discord_id", messageAuthor.id)
      .maybeSingle();

    if (error) return console.error(error);
    if (!profile)
      return console.log(`No profile found for ${messageAuthor.username}`);

    const currentTotal = profile.total_haki_points ?? 0;

    await supabase.from("haki_point_transactions").insert({
      user_id: profile.user_id,
      points_delta: 50,
      reason: "+50 haki point (angrycat removed)",
      awarded_by: user.username,
      source: "discord_reaction",
    });

    await supabase
      .from("profiles")
      .update({ total_haki_points: currentTotal + 50 })
      .eq("user_id", profile.user_id);

    console.log(
      `+50 Haki to ${messageAuthor.username} from ${user.username} via removal of ${reaction.emoji.name}`,
    );
  },
};
