module.exports = {
    name: 'minus',
    description: 'Remove Haki points from a user (hakistat role only)',

    execute: async (message, args, supabase) => {
        const REQUIRED_ROLE = 'hakistat';

        if (!message.member.roles.cache.some(role => role.name === REQUIRED_ROLE)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (args.length < 2) {
            return message.reply('Usage: !minus <discord_id_or_username> <points> <optional reason>');
        }

        const targetIdentifier = args[0];
        const points = parseInt(args[1], 10);
        const reason = args.slice(2).join(' ') || 'Manual deduction';

        if (isNaN(points) || points <= 0) {
            return message.reply('Points must be a positive number.');
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id, username, total_haki_points')
            .or(`discord_id.eq.${targetIdentifier},username.eq.${targetIdentifier}`)
            .maybeSingle();

        if (error) {
            console.error(error);
            return message.reply('Error fetching user profile.');
        }

        if (!profile) {
            return message.reply(`No profile found for ${targetIdentifier}.`);
        }

        const newTotal = (profile.total_haki_points ?? 0) - points;

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_haki_points: newTotal })
            .eq('user_id', profile.user_id);

        if (updateError) {
            console.error(updateError);
            return message.reply('Failed to update Haki points.');
        }

        // Log transaction
        const { error: insertError } = await supabase
            .from('haki_point_transactions')
            .insert({
                user_id: profile.user_id,
                points_delta: -points,
                reason,
                awarded_by: message.author.id,
                source: 'manual_command'
            });

        if (insertError) {
            console.error(insertError);
            return message.reply('Points were updated but failed to log transaction.');
        }

        message.reply(
            `➖ ${points} Haki point(s) removed from **${profile.username}**.\n` +
            `New total: **${newTotal}**`
        );
    }
};
