// Endpoint PUBLIC (pas de token requis) — expose uniquement des chiffres globaux
// (libres / occupées / total), jamais de plaque, catégorie ou info client.
// Utilisé par la page publique dispo.html.

const { kvGet } = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const state = (await kvGet('parking:state')) || {};
    const slots = (await kvGet('parking:slots')) || [];

    let occupied = 0;
    slots.forEach((id) => {
      if (state[id] && state[id].status === 'occupied') occupied++;
    });
    const total = slots.length;
    const free = total - occupied;

    return res.status(200).json({
      total,
      free,
      occupied,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};
