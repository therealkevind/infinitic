import * as fs from 'node:fs/promises';
import path from 'node:path';

function urlFor(id) {
  return new URL(`./db/${id}.json`, import.meta.url);
}

export async function read(id) {
  return fs.readFile(urlFor(id), { encoding: "utf8" });
}

export async function test(id) {
  try {
    await fs.access(urlFor(id));
    return true;
  } catch { return false; }
}

export async function update(id, data) {
  await fs.writeFile(urlFor(id), data);
}

export async function write(id, data) {
  await fs.writeFile(urlFor(id), data, { encoding: "utf8", flag: "wx" });
}

export async function remove(id) {
  await fs.rm(urlFor(id));
}

export async function list(prefix) {
  return (await fs.readdir(new URL(`./db/`, import.meta.url))).filter(key => key.startsWith(prefix)).map(key => path.basename(key, ".json"));
}
