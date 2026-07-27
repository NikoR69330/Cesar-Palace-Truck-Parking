const { kvGet, kvSet } = require('./_redis');
const crypto = require('crypto');

const USERS_KEY = 'parking:users';
const SESSIONS_KEY = 'parking:sessions';
const LOGINS_KEY = 'parking:logins';

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function getUsers() {
  const users = await kvGet(USERS_KEY);
  if (!users || !Array.isArray(users) || users.length === 0) {
    // Compte direction par défaut au tout premier lancement — à changer immédiatement.
    const seeded = [{
      id: 'u_' + Date.now(),
      username: 'direction',
      passwordHash: hashPassword('changeme123'),
      name: 'Direction',
      role: 'direction',
      active: true
    }];
    await kvSet(USERS_KEY, seeded);
    return seeded;
  }
  return users;
}

async function saveUsers(users) { await kvSet(USERS_KEY, users); }

async function getSessions() {
  const s = await kvGet(SESSIONS_KEY);
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
}
async function saveSessions(sessions) { await kvSet(SESSIONS_KEY, sessions); }

async function validateToken(token) {
  if (!token) return null;
  const sessions = await getSessions();
  return sessions[token] || null; // { username, name, role }
}

module.exports = {
  USERS_KEY, SESSIONS_KEY, LOGINS_KEY,
  hashPassword, genToken,
  getUsers, saveUsers,
  getSessions, saveSessions,
  validateToken,
  kvGet, kvSet
};
