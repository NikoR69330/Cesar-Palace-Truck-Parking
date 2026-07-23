const { kvGet, kvSet } = require('./_redis');

const ALLOWED_TYPES = ['state', 'slots', 'categories', 'reservations', 'tariff', 'history'];
const LICENSE_KEY = 'parking:license';

async function isLicenseBlocked() {
  const lic = await kvGet(LICENSE_KEY);
  if (!lic) return false; // pas encore de licence créée = premier lancement, non bloqué
  if (lic.locked) return true;
  if (lic.paidUntil) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > lic.paidUntil) return true;
  }
  return false;
}

module.exports = async (req, res) => {
  const { type } = req.query;
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: 'invalid type' });
  }

  const blocked = await isLicenseBlocked();
  if (blocked) {
    return res.status(403).json({ error: 'locked' });
  }

  const key = `parking:${type}`;

  if (req.method === 'GET') {
    const value = await kvGet(key);
    return res.status(200).json({ value: value ?? null });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (body.value === undefined) {
      return res.status(400).json({ error: 'missing value' });
    }
    await kvSet(key, body.value);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
};
