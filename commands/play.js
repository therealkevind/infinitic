import {X, O, Board, Game} from "../public/board.js";
import draw from "../src/draw.js";
import * as db from "../src/db.js";

import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('take your turn in a game')
  .addStringOption(option => option.setName("coords").setDescription("coordinates to place your piece at, in A1 notation").setRequired(true))
  .addUserOption(option => option.setName("opponent").setDescription("who you're playing against; required if you're currently playing multiple games in the same channel"))
  .setDMPermission(false);

export async function execute(interaction) {
  const coordText = interaction.options.getString("coords").toUpperCase(),
    user = interaction.user,
    opponentId = interaction.options.getUser("opponent")?.id ?? await db.inferOpponentId(interaction.channelId, user.id);

  if (!opponentId) {
    return interaction.reply({ content: opponentId == null ? `You don't seem to be playing any games in this channel right now.` : `I'm not sure which game you're talking about. Please mention your intended opponent.`, ephemeral: true });
  }

  const opponent = await interaction.client.users.fetch(opponentId);
  const id = db.idFor(interaction.channelId, user.id, opponentId);

  if (!(await db.has(id))) {
    return interaction.reply({ content: `You don't seem to be playing a game with ${opponent.username} in this channel right now.`, ephemeral: true });
  }

  const game = await db.get(id);

  const pieceStr = game.whoseTurn == X ? "X" : "O";

  if (game.extraData[pieceStr] != user.id) {
    return interaction.reply({ content: `It's not your turn right now; please wait for ${opponent.username} to make their move.`, ephemeral: true });
  }

  const [, letters, number] = coordText.match(/^([A-Z]+)([0-9]+)$/i) ?? [];

  if (!number) {
    return interaction.reply({ content: `Those aren't valid coordinates. Please enter coordinates using A1 notation.`, ephemeral: true });
  }

  const x = Board.lettersToNumber(letters)-1n, y = BigInt(number)-1n;
  const {lastInteraction} = game.extraData;

  if (!game.isValid(x, y)) {
    return interaction.reply({ content: `Those coordinates aren't within the usable range. Please enter coordinates within ${game.requirementsA1()}.`, ephemeral: true });
  } else if (!game.isOpen(x, y)) {
    return interaction.reply({ content: `Those coordinates are taken. Please enter coordinates of an empty space.`, ephemeral: true });
  }

  const won = game.play(x, y), image = draw(game);

  if (won) {
    await interaction.reply({ content: game.winner == true ? `The game between ${user} (as ${pieceStr}) and ${opponent} ended in a tie.` : `${user} won (as ${pieceStr}) in their game against ${opponent}!`, files: [ image ] });
    await db.remove(id);
  } else {
    await interaction.reply({ content: `${user} made their move, at \`${coordText}\`. It's now ${opponent}'s turn, playing as ${pieceStr == "X" ? "O" : "X"}!\n(Use \`/play\` to choose a location; you can play ${game.requirementsAreTrivial() ? "anywhere" : `within \`${game.requirementsA1()}\``} this turn.)`, files: [ image ] })
    game.extraData.lastInteraction = (await interaction.fetchReply()).id;
    await db.update(id);
  }
  await (await interaction.channel.messages.fetch(lastInteraction)).delete();
};
