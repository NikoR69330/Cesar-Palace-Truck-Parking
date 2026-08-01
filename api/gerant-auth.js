const { kvGet, kvSet } = require('./_redis');
const crypto = require('crypto');

// Espace gérant : mot de passe unique, séparé des comptes salarié/direction
// (api/_auth.js). Ne touche à rien de l'existant.
const GERANT_PASSWORD_KEY = 'parking:gerant_password';
const GERANT_SESSIONS_KEY = 'parking:gerant_sessions';
const DEFAULT_GERANT_PASSWORD = 'gerant2026'; // à changer dès la première connexion

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}
function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function getGerantPasswordHash() {
  let h = await kvGet(GERANT_PASSWORD_KEY);
  if (!h) {
    h = hashPassword(DEFAULT_GERANT_PASSWORD);
    await kvSet(GERANT_PASSWORD_KEY, h);
  }
  return h;
}
async function getSessions() {
  const s = await kvGet(GERANT_SESSIONS_KEY);
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
}
async function saveSessions(sessions) {
  await kvSet(GERANT_SESSIONS_KEY, sessions);
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { action, token } = req.query;
    if (action === 'me') {
      const sessions = await getSessions();
      if (!token || !sessions[token]) return res.status(401).json({ error: 'invalid session' });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'unknown action' });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (body.action === 'login') {
      const hash = await getGerantPasswordHash();
      if (hashPassword(body.password || '') !== hash) {
        return res.status(401).json({ error: 'invalid password' });
      }
      const token = genToken();
      const sessions = await getSessions();
      sessions[token] = { createdAt: new Date().toISOString() };
      await saveSessions(sessions);
      return res.status(200).json({ token });
    }

    if (body.action === 'logout') {
      const sessions = await getSessions();
      delete sessions[body.token];
      await saveSessions(sessions);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'changePassword') {
      const sessions = await getSessions();
      if (!body.token || !sessions[body.token]) return res.status(401).json({ error: 'invalid session' });
      if (!body.newPassword || body.newPassword.trim().length < 4) {
        return res.status(400).json({ error: 'password too short' });
      }
      await kvSet(GERANT_PASSWORD_KEY, hashPassword(body.newPassword.trim()));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  }

  return res.status(405).json({ error: 'method not allowed' });
};
