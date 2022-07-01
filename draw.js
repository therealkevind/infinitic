import {X, O, Board, Game} from "./board.js";
import Canvas from "@napi-rs/canvas";
import { MessageAttachment } from "discord.js";

export default function draw(game) {
  const size = game.getSize(),
    canvas = Canvas.createCanvas(size, size);
  game.draw(canvas);
  return new MessageAttachment(canvas.toBuffer("image/png"), "board.png");
}
