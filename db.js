import {X, O, Board, Game} from "../board.js";

import * as fs from 'node:fs/promises';
import path from 'node:path';

const map = new Collection();

export function add(id, game) {
  map.set(id, game);
};
export function has(id) {
  return map.has(id);
};
export async function get(id) {
  if (map.has(id)) return map.get(id);
  return Game.fromJSON(await fs.readFile(new URL(`./db/${id}.json`, import.meta.url), { encoding: "utf8" }));
}
export async function update(id) {
  await fs.writeFile(new URL(`./db/${id}.json`, import.meta.url), JSON.stringify(map.get(id)));
}
export async *function with(id) {
  yield get(id);
  await update(id);
}
export async function rename(id, newId) {
  map.set(newId, map.get(id));
  map.delete(id);
  try {
    await fs.rename(new URL(`./db/${id}.json`, import.meta.url), new URL(`./db/${newId}.json`, import.meta.url));
  } catch (e) { console.warn(e); }
}
