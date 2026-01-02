const dotenv = require('dotenv'); 
dotenv.config();

const { Client, GatewayIntentBits } = require('discord.js');
const supabase = require('./utils/supabase');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const fs = require('fs');
const path = require('path');

client.commands = new Map();
client.reactions = new Map();

// load commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// load reactions
const reactionFiles = fs.readdirSync(path.join(__dirname, 'reactions')).filter(f => f.endsWith('.js'));
for (const file of reactionFiles) {
    const reactionHandler = require(`./reactions/${file}`);
    client.reactions.set(reactionHandler.name, reactionHandler);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, supabase);
    } catch (err) {
        console.error(err);
        message.channel.send('There was an error executing that command.');
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        for (const [, handler] of client.reactions) {
            if (handler.executeAdd) {
                await handler.executeAdd(reaction, user, supabase);
            }
        }
    } catch (err) {
        console.error('Error in reactionAdd handler:', err);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        for (const [, handler] of client.reactions) {
            if (handler.executeRemove) {
                await handler.executeRemove(reaction, user, supabase);
            }
        }
    } catch (err) {
        console.error('Error in reactionRemove handler:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
