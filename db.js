import {Game} from "./board.js";

import * as backend from "./db-backend.js";
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
    const moreOptions = (await backend.list()).filter(key => key.startsWith(channelId) && key.includes("-" + playerId));
    if (moreOptions.length > 1) return false;
    else if (moreOptions.length == 0) return null;
    else match = moreOptions[0];
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
  return backend.test(id);
};
export async function get(id) {
  if (map.has(id)) return map.get(id);
  const game = Game.fromJSON(await backend.read(id));
  map.set(id, game);
  return game;
}
export async function update(id) {
  await backend.update(id, JSON.stringify(map.get(id)));
}
export async function set(id, board) {
  await backend.write(id, JSON.stringify(board));
  map.set(id, board);
}
export async function remove(id) {
  await fs.rm(urlFor(id));
  map.delete(id);
}
