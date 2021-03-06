import {X, O, Board, Game} from "../public/board.js";
import draw from "../src/draw.js";
import * as db from "../src/db.js";

import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageButton } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('start-game')
  .setDescription('starts a new game')
  .addUserOption(option => option.setName("opponent").setDescription("who to play against").setRequired(true))
  .addIntegerOption(option => option.setName("depth").setDescription("how many levels of tic-tac-toe to play").setMinValue(1).setRequired(true))
  .addIntegerOption(option => option.setName("width").setDescription("width of each board (default 3)").setMinValue(2))
  .addIntegerOption(option => option.setName("height").setDescription("height of each board (default 3)").setMinValue(2))
  .addIntegerOption(option => option.setName("goal").setDescription("number of symbols in a row to win each board (defaults to smaller of width and height)").setMinValue(1))
  .addStringOption(option => option.setName("symbol").setDescription("which symbol you want to use (random by default)")
    .addChoices({ name: "X", value: "X" }, { name: "O", value: "O" }))
  .setDMPermission(false);

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: `Sorry, DMs aren't supported at the moment.`, ephemeral: true });
  }

  const nestLevel = BigInt(interaction.options.getInteger("depth")),
    width = BigInt(interaction.options.getInteger("width") ?? 3),
    height = BigInt(interaction.options.getInteger("height") ?? 3),
    goal = BigInt(interaction.options.getInteger("goal") ?? Math.min(Number(width), Number(height))),
    symbol = (interaction.options.getString("symbol") ?? (Math.random()<.5?"O":"X")) == "X" ? O : X,
    opponent = interaction.options.getUser("opponent"),
    user = interaction.user;

  if (opponent.bot) {
    return interaction.reply({ content: `Can't play against bots.`, ephemeral: true });
  }
  if (goal > width && goal > height) {
    return interaction.reply({ content: `You can't reach ${goal} in a row on a ${width} by ${height} board.`, ephemeral: true });
  }

  const id = db.idFor(interaction.channelId, user.id, opponent.id);
  if (await db.has(id)) {
    return interaction.reply({ content: `You're already playing a game with ${opponent.username} in this channel! Please finish or end that game first.`, ephemeral: true });
  }

  await interaction.reply({
    content: `${opponent}, you are being challenged by ${user} to a ${nestLevel > 1 ? nestLevel + "-level " : ""}game of ${width == 3 && height == 3 && goal == 3 ? "Tic-Tac-Toe" : goal + `-in-a-row (on a ${width} by ${height} board)`}! (You'll play as ${symbol == O ? "O" : "X"}.) Do you accept?`,
    components: [new MessageActionRow().addComponents(
      new MessageButton().setCustomId("accept-game").setLabel("Sure!").setStyle("PRIMARY"),
      new MessageButton().setCustomId("decline-game").setLabel("Nah").setStyle("SECONDARY"),
    )],
  });

  const interactionReply = await interaction.fetchReply();
  const collector = interactionReply.createMessageComponentCollector({
    filter: i => i.user == opponent,
    time: 15000, max: 1,
  });
  collector.on("collect", async i => {
    if (i.customId == "accept-game") {
      const xGoesFirst = Math.random() < .5;
      const game = Game.empty(Board.nested(nestLevel, width, height, goal), xGoesFirst ? X : O);
      game.extraData = {};
      if (symbol == O) {
        game.extraData.O = opponent.id;
        game.extraData.X = user.id;
      } else {
        game.extraData.X = opponent.id;
        game.extraData.O = user.id;
      }
      game.extraData.lastInteraction = (await interaction.followUp({ content: `${xGoesFirst == (symbol == X) ? opponent : user} was selected to go first, as ${xGoesFirst ? "X" : "O"}!\n(Use \`/play\` to choose a location; you can play anywhere this turn. ${xGoesFirst == (symbol == X) ? user : opponent} plays next.)`, files: [draw(game)] })).id;
      await db.set(id, game);
      await interaction.deleteReply();
    } else {
      await interaction.followUp({ content: `Your opponent declined the game.`, ephemeral: true });
      await interaction.deleteReply();
    }
  });
  collector.on("end", async collected => {
    if (collected.size == 0) {
      await interaction.followUp({ content: `I didn't get a response in time. Please make sure your opponent is available before starting a game.`, ephemeral: true });
      await interaction.deleteReply();
    }
  });
};
