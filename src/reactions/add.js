const emojis = require("../utils/emojis");

module.exports = {
    name: 'add Haki point',

    executeAdd: async (reaction, user, supabase) => {
        if (reaction.emoji.id !== emojis.plusEmojiID) return;

        const messageAuthor = reaction.message.author;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id, total_haki_points')
            .eq('discord_id', messageAuthor.id)
            .maybeSingle();

        if (error) return console.error(error);
        if (!profile) return console.log(`No profile found for ${messageAuthor.username}`);

        const currentTotal = profile.total_haki_points ?? 0;

        await supabase.from('haki_point_transactions').insert({
            user_id: profile.user_id,
            points_delta: 1,
            reason: '+1 haki point emoji',
            awarded_by: user.username,
            source: 'discord_reaction'
        });

        await supabase
            .from('profiles')
            .update({ total_haki_points: currentTotal + 1 })
            .eq('user_id', profile.user_id);

        console.log(`+1 Haki to ${messageAuthor.username} from ${user.username} via ${reaction.emoji.name}`);
    },

    executeRemove: async (reaction, user, supabase) => {
        if (reaction.emoji.id !== emojis.minusEmojiID) return;

        const messageAuthor = reaction.message.author;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id, total_haki_points')
            .eq('discord_id', messageAuthor.id)
            .maybeSingle();

        if (error) return console.error(error);
        if (!profile) return console.log(`No profile found for ${messageAuthor.username}`);

        const currentTotal = profile.total_haki_points ?? 0;

        await supabase.from('haki_point_transactions').insert({
            user_id: profile.user_id,
            points_delta: 1,
            reason: '+1 haki point (-1 haki point emoji removed)',
            awarded_by: user.username,
            source: 'discord_reaction'
        });

        await supabase
            .from('profiles')
            .update({ total_haki_points: currentTotal + 1 })
            .eq('user_id', profile.user_id);

        console.log(`+1 Haki to ${messageAuthor.username} from ${user.username} via removal of ${reaction.emoji.name}`);
    }
};
