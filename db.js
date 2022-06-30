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
  return Game.fromJSON(await fs.readFile(path.join(path.dirname(import.meta.url), 'db', id + ".json"), { encoding: "utf8" }));
}
export async function update(id) {
  await fs.writeFile(path.join(path.dirname(import.meta.url), 'db', id + ".json"), JSON.stringify(map.get(id)));
}
export async *function with(id) {
  yield get(id);
  await update(id);
}
export async function rename(id, newId) {
  map.set(newId, map.get(id));
  map.delete(id);
  try {
    await fs.rename(path.join(path.dirname(import.meta.url), 'db', id + ".json"), path.join(path.dirname(import.meta.url), 'db', newId + ".json"));
  } catch {}
}
