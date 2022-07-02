import {X, O, Board, Game} from "../board.js";
import draw from "../draw.js";
import * as db from "../db.js";

import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageButton } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('offer-draw')
  .setDescription('offer a draw')
  .addUserOption(option => option.setName("opponent").setDescription("who you're offering a draw with").setRequired(true));

export async function execute(interaction) {
  const user = interaction.user,
    opponent = interaction.options.getUser("opponent");

  const id = db.idFor(interaction.channelId, user.id, opponent.id);

  if (!(await db.has(id))) {
    return interaction.reply({ content: `You don't seem to be playing a game with ${opponent.username} in this channel right now.`, ephemeral: true });
  }

  const game = await db.get(id);

  const {lastInteraction} = game.extraData;

  const yourStr = (game.whoseTurn == X) == (game.extraData.X == user.id) ? "X" : "O";

  await interaction.reply({
    content: `${opponent}, ${user} is offering a draw. Do you accept?`,
    components: [new MessageActionRow().addComponents(
      new MessageButton().setCustomId("accept-draw").setLabel("Yeah").setStyle("SECONDARY"),
      new MessageButton().setCustomId("decline-draw").setLabel("Nope").setStyle("PRIMARY"),
    )],
  });

  const interactionReply = await interaction.fetchReply();
  const collector = interactionReply.createMessageComponentCollector({
    filter: i => i.user == opponent,
    time: 15000, max: 1,
  });
  let finished;

  collector.on("collect", async i => {
    if (i.customId == "accept-draw") {
      await interaction.followUp({ content: `${opponent} accepted a draw against ${user} (who was playing ${yourStr}).`, files: [draw(game)] });
      await db.remove(id);
      await interaction.deleteReply();
      await (await interaction.channel.messages.fetch(lastInteraction)).delete();
    } else {
      await interaction.followUp({ content: `Your opponent declined a draw.`, ephemeral: true });
      await interaction.deleteReply();
    }
  });
  collector.on("end", async collected => {
    if (collected.size == 0) {
      await interaction.followUp({ content: game.extraData.lastInteraction == lastInteraction ? `I didn't get a response in time. Please make sure your opponent is available to accept a draw.` : `Your opponent made a move rather than accepting a draw.`, ephemeral: true });
      await interaction.deleteReply();
    }
  });
};
