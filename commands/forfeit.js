import {X, O, Board, Game} from "../board.js";
import draw from "../draw.js";
import * as db from "../db.js";

import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
  .setName('forfeit')
  .setDescription('forfeit a game')
  .addUserOption(option => option.setName("opponent").setDescription("who you're forfeiting against").setRequired(true))
  .setDMPermission(false);

export async function execute(interaction) {
  const user = interaction.user,
    opponent = interaction.options.getUser("opponent");

  const id = db.idFor(interaction.channelId, user.id, opponent.id);

  if (!(await db.has(id))) {
    return interaction.reply({ content: `You don't seem to be playing a game with ${opponent.username} in this channel right now.`, ephemeral: true });
  }

  const game = await db.get(id);

  const yourStr = (game.whoseTurn == X) == (game.extraData.X == user.id) ? "X" : "O";

  const {lastInteraction} = game.extraData;

  await interaction.reply({ content: `${user} (playing ${yourStr}) forfeits against ${opponent}.`, files: [ draw(game) ] });
  await db.remove(id);
  await (await interaction.channel.messages.fetch(lastInteraction)).delete();
};
