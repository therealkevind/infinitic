import {Game} from "./board.js";

import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Collection } from "discord.js";

const map = new Collection();

function urlFor(id) {
  return new URL(`./db/${id}.json`, import.meta.url);
}

export function idFor(channelId, ...playerIds) {
  playerIds.sort();
  return channelId + "-" + playerIds.join("-");
}
export async function inferOpponentId(channelId, playerId) {
  const options = map.filter((val, key) => key.startsWith(channelId) && key.includes("-" + playerId));
  let match;
  if (options.size > 1) return false;
  else if (options.size == 0) {
    const moreOptions = (await fs.readdir(new URL(`./db/`, import.meta.url))).filter(key => key.startsWith(channelId) && key.includes("-" + playerId));
    if (moreOptions.length > 1) return false;
    else if (moreOptions.length == 0) return null;
    else match = path.basename(moreOptions[0], ".json");
  } else match = options.firstKey();
  const [, a, b] = match.split("-");
  if (a == playerId) return b;
  else return a;
}

export function add(id, game) {
  map.set(id, game);
};
export async function has(id) {
  if (map.has(id)) return true;
  try {
    await fs.access(urlFor(id));
    return true;
  } catch { return false; }
};
export async function get(id) {
  if (map.has(id)) return map.get(id);
  const game = Game.fromJSON(await fs.readFile(new URL(`./db/${id}.json`, import.meta.url), { encoding: "utf8" }));
  map.set(id, game);
  return game;
}
export async function update(id) {
  await fs.writeFile(urlFor(id), JSON.stringify(map.get(id)));
}
export async function set(id, board) {
  await fs.writeFile(urlFor(id), JSON.stringify(board), { encoding: "utf8", flag: "wx" });
  map.set(id, board);
}
export async function remove(id) {
  await fs.rm(urlFor(id));
  map.delete(id);
}
export async function rename(id, newId) {
  map.set(newId, map.get(id));
  map.delete(id);
  try {
    await fs.rename(urlFor(id), urlFor(newId));
  } catch (e) { console.warn(e); }
}
