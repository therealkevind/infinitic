import * as fs from 'node:fs/promises';
import path from 'node:path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from './config.json' assert { type: "json" };
const { clientId, token } = config;

const commands = [];
const commandsPath = new URL('./commands/', import.meta.url);
const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import("./commands/" + file);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

await rest.put(Routes.applicationCommands(clientId), { body: commands });

console.log('Successfully registered application commands.');
