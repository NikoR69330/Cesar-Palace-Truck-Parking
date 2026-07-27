const {
  hashPassword, genToken,
  getUsers, saveUsers,
  getSessions, saveSessions,
  validateToken,
  kvGet, kvSet, LOGINS_KEY
} = require('./_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { token, action } = req.query;
    const session = await validateToken(token);

    if (action === 'me') {
      if (!session) return res.status(401).json({ error: 'invalid session' });
      return res.status(200).json({ name: session.name, role: session.role, username: session.username });
    }

    if (action === 'listUsers') {
      if (!session || session.role !== 'direction') return res.status(403).json({ error: 'forbidden' });
      const users = await getUsers();
      return res.status(200).json({
        users: users.map(u => ({ username: u.username, name: u.name, role: u.role, active: u.active !== false }))
      });
    }

    if (action === 'logins') {
      if (!session || session.role !== 'direction') return res.status(403).json({ error: 'forbidden' });
      const logins = (await kvGet(LOGINS_KEY)) || [];
      return res.status(200).json({ logins: logins.slice(0, 100) });
    }

    return res.status(400).json({ error: 'unknown action' });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (body.action === 'login') {
      const users = await getUsers();
      const username = (body.username || '').trim();
      const user = users.find(u => u.username === username && u.active !== false);
      if (!user || user.passwordHash !== hashPassword(body.password || '')) {
        return res.status(401).json({ error: 'invalid credentials' });
      }
      const token = genToken();
      const sessions = await getSessions();
      sessions[token] = { username: user.username, name: user.name, role: user.role };
      await saveSessions(sessions);

      const logins = (await kvGet(LOGINS_KEY)) || [];
      logins.unshift({ username: user.username, name: user.name, role: user.role, time: new Date().toISOString() });
      await kvSet(LOGINS_KEY, logins.slice(0, 200));

      return res.status(200).json({ token, name: user.name, role: user.role, username: user.username });
    }

    if (body.action === 'logout') {
      const sessions = await getSessions();
      delete sessions[body.token];
      await saveSessions(sessions);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'createUser') {
      const session = await validateToken(body.token);
      if (!session || session.role !== 'direction') return res.status(403).json({ error: 'forbidden' });
      const username = (body.username || '').trim();
      if (!username || !body.password || !body.name) return res.status(400).json({ error: 'missing fields' });
      const users = await getUsers();
      if (users.find(u => u.username === username)) return res.status(409).json({ error: 'username taken' });
      users.push({
        id: 'u_' + Date.now(),
        username,
        passwordHash: hashPassword(body.password),
        name: body.name,
        role: body.role === 'direction' ? 'direction' : 'salarie',
        active: true
      });
      await saveUsers(users);
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'deleteUser') {
      const session = await validateToken(body.token);
      if (!session || session.role !== 'direction') return res.status(403).json({ error: 'forbidden' });
      let users = await getUsers();
      const target = users.find(u => u.username === body.username);
      if (!target) return res.status(404).json({ error: 'not found' });
      const remainingDirection = users.filter(u => u.role === 'direction' && u.username !== body.username);
      if (target.role === 'direction' && remainingDirection.length === 0) {
        return res.status(400).json({ error: 'cannot delete last direction account' });
      }
      users = users.filter(u => u.username !== body.username);
      await saveUsers(users);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  }

  return res.status(405).json({ error: 'method not allowed' });
};
