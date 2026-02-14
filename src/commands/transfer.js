module.exports = {
  name: "transfer",
  description:
    "Transfer Haki points from one user to another (hakistat role only)",

  execute: async (message, args, supabase) => {
    const REQUIRED_ROLE = "hakistat";

    if (
      !message.member.roles.cache.some((role) => role.name === REQUIRED_ROLE)
    ) {
      return message.reply("You do not have permission to use this command.");
    }

    if (args.length < 3) {
      return message.reply(
        "Usage: !transfer <source_discord_id_or_username> <target_discord_id_or_username> <points> <optional reason>",
      );
    }

    const sourceIdentifier = args[0];
    const targetIdentifier = args[1];
    const points = parseInt(args[2], 10);
    const reason = args.slice(3).join(" ") || "Manual adjustment";

    if (isNaN(points) || points <= 0) {
      return message.reply("Points must be a valid positive number.");
    }

    if (sourceIdentifier === targetIdentifier) {
      return message.reply("Source and target cannot be the same.");
    }

    const { data: sourceProfile, error: sourceError } = await supabase
      .from("profiles")
      .select("user_id, username, total_haki_points")
      .or(`discord_id.eq.${sourceIdentifier},username.eq.${sourceIdentifier}`)
      .maybeSingle();

    if (sourceError) {
      console.error(sourceError);
      return message.reply("Error fetching source user profile.");
    }

    if (!sourceProfile) {
      return message.reply(
        `No profile found for ${sourceIdentifier}.`,
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, username, total_haki_points")
      .or(`discord_id.eq.${targetIdentifier},username.eq.${targetIdentifier}`)
      .maybeSingle();

    if (error) {
      console.error(error);
      return message.reply("Error fetching user profile.");
    }

    if (!profile) {
      return message.reply(`No profile found for ${targetIdentifier}.`);
    }

    const sourceNewTotal = (sourceProfile.total_haki_points ?? 0) - points;
    const newTotal = (profile.total_haki_points ?? 0) + points;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ total_haki_points: sourceNewTotal })
      .eq("user_id", sourceProfile.user_id);

    if (updateError) {
      console.error(updateError);
      return message.reply("Failed to update source user's Haki points.");
    }

    // Update target user's points
    const { error: updateTargetError } = await supabase
      .from("profiles")
      .update({ total_haki_points: newTotal })
      .eq("user_id", profile.user_id);

    if (updateTargetError) {
      console.error(updateTargetError);
      return message.reply("Failed to update target user's Haki points.");
    }

    // Log transaction
    const { error: sourceInsertError } = await supabase
      .from("haki_point_transactions")
      .insert({
        user_id: sourceProfile.user_id,
        points_delta: -points,
        reason,
        awarded_by: message.author.username,
        source: "manual_command",
      });
    if (sourceInsertError) {
      console.error(sourceInsertError);
      return message.reply(
        "Source points were updated but failed to log transaction.",
      );
    }

    const { error: insertError } = await supabase
      .from("haki_point_transactions")
      .insert({
        user_id: profile.user_id,
        points_delta: points,
        reason,
        awarded_by: message.author.username,
        source: "manual_command",
      });
    if (insertError) {
      console.error(insertError);
      return message.reply(
        "Target points were updated but failed to log transaction.",
      );
    }

    message.reply(
      `↔️ ${points > 0 ? "+" : ""}${points} Haki point(s) transferred from **${sourceProfile.username}** to **${profile.username}**.\n` +
        `${sourceProfile.username}'s new total: **${sourceNewTotal}**\n` +
        `${profile.username}'s new total: **${newTotal}**`,
    );
  },
};
