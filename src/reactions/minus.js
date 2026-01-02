// reactions/minus.js
module.exports = {
    name: 'subtract Haki point',
    minusEmoji: 'emoji_2',
    plusEmoji: 'emoji_1',

    executeMinus: async (reaction, user, supabase) => {
        if (reaction.emoji.name !== module.exports.minusEmoji) return;

        const messageAuthor = reaction.message.author;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id, total_haki_points')
            .eq('discord_id', messageAuthor.id)
            .maybeSingle();

        if (error) return console.error(error);
        if (!profile) return console.log(`No profile found for ${messageAuthor.username}`);

        const currentTotal = profile.total_haki_points ?? 0;

        const { error: insertError } = await supabase
            .from('haki_point_transactions')
            .insert({
                user_id: profile.user_id,
                points_delta: -1,
                reason: '-1 haki point emoji',
                awarded_by: user.id,
                source: 'discord_reaction'
            });

        if (insertError) return console.error(insertError);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_haki_points: currentTotal - 1 })
            .eq('user_id', profile.user_id);

        if (updateError) return console.error(updateError);

        console.log(`-1 Haki to ${messageAuthor.username} from ${user.username} via ${module.exports.minusEmoji}`);
    },

    executeRemove: async (reaction, user, supabase) => {
        if (reaction.emoji.name !== module.exports.plusEmoji) return;

        const messageAuthor = reaction.message.author;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id, total_haki_points')
            .eq('discord_id', messageAuthor.id)
            .maybeSingle();

        if (error) return console.error(error);
        if (!profile) return console.log(`No profile found for ${messageAuthor.username}`);

        const currentTotal = profile.total_haki_points ?? 0;

        const { error: insertError } = await supabase
            .from('haki_point_transactions')
            .insert({
                user_id: profile.user_id,
                points_delta: -1,
                reason: '-1 haki point (emoji_1 removed)',
                awarded_by: user.id,
                source: 'discord_reaction'
            });

        if (insertError) return console.error(insertError);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_haki_points: currentTotal - 1 })
            .eq('user_id', profile.user_id);

        if (updateError) return console.error(updateError);

        console.log(`-1 Haki to ${messageAuthor.username} from ${user.username} via removal of ${module.exports.plusEmoji}`);
    }
};
