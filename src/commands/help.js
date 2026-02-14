module.exports = {
    name: 'help',
    description: 'List all hakistat bot commands, or a single hakistat bot command, along with their usage and description',
    usage: '!help <optional command>',

    helpMessageHeader:
        `**HAKISTAT COMMANDS**\n` +
        `────────────────────────\n` +
        `Below is a list of all available commands`,

    async execute(message, args) {

        try {
            const commands = message.client.commands;

            if (args.length > 0) {
                // specific command provided
                const commandName = args[0].toLowerCase();
                const command = commands.get(commandName);

                if (!command) {
                    return message.channel.send(`Command !${commandName} does not exist`);
                }

                return message.channel.send(
                    formatCommand(command)
                );
            } else {
                const sortedCommands = [...commands.values()]
                    .sort((a, b) => a.name.localeCompare(b.name));

                let fullHelpMessage = this.helpMessageHeader + '\n\n';

                sortedCommands.forEach(command => {
                    fullHelpMessage += formatCommand(command);
                });

                message.channel.send(fullHelpMessage);
            }

        } catch (err) {
            console.error(err.message);
            message.channel.send('There was an error processing your request.');
        }

        function formatCommand(command) {
            return `**!${command.name}**\n${command.description}\nUsage: ${command.usage}\n`;
        }
    }


};
