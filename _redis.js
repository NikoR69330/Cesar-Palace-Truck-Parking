const { createClient } = require('redis');

let clientPromise = null;

function getClient() {
  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis Client Error', err));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

async function kvGet(key) {
  const client = await getClient();
  const raw = await client.get(key);
  return raw === null || raw === undefined ? null : JSON.parse(raw);
}

async function kvSet(key, value) {
  const client = await getClient();
  await client.set(key, JSON.stringify(value));
}

module.exports = { kvGet, kvSet };
