import {X, O, Board, Game} from "../board.js";
import draw from "../draw.js";

import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  data: new SlashCommandBuilder()
    .setName('start-game')
    .setDescription('starts a new game')
    .addIntegerOption(option => option.setName("nestLevel").setDescription("how many levels of tic-tac-toe to play").setMinValue(1).setRequired(true))
    .addUserOption(option => option.setName("opponent").setDescription("who to play against").setRequired(true))
    .addStringOption(option => option.setName("symbol").setDescription("which symbol you want to use")
      .addChoices({ name: "X", value: "X" }, { name: "O", value: "O" })),
  async execute(interaction) {
    const nestLevel = interaction.options.getInteger("nestLevel"),
      symbol = (interaction.options.getString("symbol") ?? (Math.random()<.5?"O":"X")) == "X" ? O : X,
      opponent = interaction.options.getUser("opponent"),
      user = interaction.user;
    const game = Game.empty(Board.nested(), symbol);
    if (symbol == O) {
      game.extraData.O = opponent.id;
      game.extraData.X = user.id;
    } else {
      game.extraData.X = opponent.id;
      game.extraData.O = user.id;
    }
    interaction.reply("Hi! Here's a board:", { files: [draw(game)] });
  },
};
