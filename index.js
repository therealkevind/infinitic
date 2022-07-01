import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Client, Collection, Intents } from 'discord.js';
import config from './config.json' assert { type: "json" };
const { token } = config;

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Map();
const commandsPath = new URL('./commands/', import.meta.url);
const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import("./commands/" + file);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.login(token);
