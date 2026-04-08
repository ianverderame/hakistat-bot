const emojis = require("../utils/emojis");
const hakiID = "1069683217420005518";

const restrictedEmojis = {};
restrictedEmojis[emojis.angrycatEmojiID] = { points: -50, user_id: hakiID };
restrictedEmojis[emojis.yaycatEmojiID] = { points: 50, user_id: hakiID };
restrictedEmojis[emojis.hakistatcomEmojiID] = { points: 100, user_id: hakiID };

module.exports = {
  name: "Restricted emoji reacts points",

  executeAdd: async (reaction, user, supabase) => {
    if (!(reaction.emoji.id in restrictedEmojis)) return;

    if (user.id !== restrictedEmojis[reaction.emoji.id].user_id) return;

    const points = restrictedEmojis[reaction.emoji.id].points;

    const messageAuthor = reaction.message.author;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, total_haki_points")
      .eq("discord_id", messageAuthor.id)
      .maybeSingle();

    if (error) return console.error(error);
    if (!profile) return console.log(`No profile found for ${messageAuthor.username}`);

    const currentTotal = profile.total_haki_points ?? 0;

    await supabase.from("haki_point_transactions").insert({
      user_id: profile.user_id,
      points_delta: points,
      reason: `${points} haki points. ${reaction.emoji.name} added`,
      awarded_by: user.username,
      source: "discord_reaction",
    });

    await supabase
      .from("profiles")
      .update({ total_haki_points: currentTotal + points })
      .eq("user_id", profile.user_id);

    console.log(
      `${points} Haki to ${messageAuthor.username} from ${user.username} via ${reaction.emoji.name}`,
    );
  },

  executeRemove: async (reaction, user, supabase) => {
    if (!(reaction.emoji.id in restrictedEmojis)) return;

    if (user.id !== restrictedEmojis[reaction.emoji.id].user_id) return;

    const points = restrictedEmojis[reaction.emoji.id].points;

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
      points_delta: -points,
      reason: `${-points} haki point. ${reaction.emoji.name} removed`,
      awarded_by: user.username,
      source: "discord_reaction",
    });

    await supabase
      .from("profiles")
      .update({ total_haki_points: currentTotal - points })
      .eq("user_id", profile.user_id);

    console.log(
      `${-points} Haki to ${messageAuthor.username} from ${user.username} via removal of ${reaction.emoji.name}`,
    );
  },
};
