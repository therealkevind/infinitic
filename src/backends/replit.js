import Client from "@replit/database";

const client = new Client();

export async function read(id) {
  return client.get(id);
}

export async function test(id) {
  try {
    return !!(await read(id));
  } catch { return false; }
}

export async function update(id, data) {
  await write(id, data);
}

export async function write(id, data) {
  await client.set(id, data);
}

export async function remove(id) {
  await client.delete(id);
}

export async function list(prefix) {
  return client.list(prefix);
}
