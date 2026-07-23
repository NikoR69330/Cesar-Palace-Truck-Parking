const { kvGet, kvSet } = require('./_redis');

const LICENSE_KEY = 'parking:license';
const DEFAULT_ADMIN_CODE = '1234';

function computeStatus(lic) {
  if (!lic) return { blocked: false, locked: false, paidUntil: null };
  const today = new Date().toISOString().slice(0, 10);
  const expired = lic.paidUntil ? today > lic.paidUntil : false;
  return {
    blocked: !!lic.locked || expired,
    locked: !!lic.locked,
    paidUntil: lic.paidUntil || null
  };
}

module.exports = async (req, res) => {
  let lic = await kvGet(LICENSE_KEY);
  if (!lic) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    lic = { locked: false, paidUntil: d.toISOString().slice(0, 10), adminCode: DEFAULT_ADMIN_CODE };
    await kvSet(LICENSE_KEY, lic);
  }

  if (req.method === 'GET') {
    // Ne renvoie jamais adminCode : seul le statut calculé sort du serveur.
    return res.status(200).json(computeStatus(lic));
  }

  if (req.method === 'POST') {
    const { code, locked, paidUntil, newCode } = req.body || {};
    if (code !== lic.adminCode) {
      return res.status(401).json({ error: 'invalid code' });
    }
    const updated = {
      locked: typeof locked === 'boolean' ? locked : lic.locked,
      paidUntil: paidUntil !== undefined ? paidUntil : lic.paidUntil,
      adminCode: newCode && newCode.trim() ? newCode.trim() : lic.adminCode
    };
    await kvSet(LICENSE_KEY, updated);
    return res.status(200).json(computeStatus(updated));
  }

  return res.status(405).json({ error: 'method not allowed' });
};
