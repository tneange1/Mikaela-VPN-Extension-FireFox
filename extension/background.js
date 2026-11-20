// Mikaela VPN — Firefox. Прокси через proxy.onRequest, логин/пароль передаются прямо в ответе.
const SERVERS_URL = 'https://raw.githubusercontent.com/tneange1/Mikaela-VPN-Chrome-Extension/main/servers.json'; // список серверов (только данные, не код)
const api = typeof browser !== 'undefined' ? browser : chrome;
const get = (k) => api.storage.local.get(k);
const set = (o) => api.storage.local.set(o);

const PRIVATE = /^(localhost|.*\.local|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?)$/i;

async function loadServers(force) {
  const { servers, fetchedAt = 0 } = await get(['servers', 'fetchedAt']);
  if (!force && servers && servers.length && Date.now() - fetchedAt < 6 * 3600e3) return servers;
  let list = null;
  try {
    const r = await fetch(SERVERS_URL, { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j.servers)) list = j.servers; }
  } catch {}
  if (!list || !list.length) {
    try { list = (await (await fetch(api.runtime.getURL('servers.json'))).json()).servers; } catch {}
  }
  list = (list || []).filter(s => s && s.host && s.port && s.username && !/REPLACE/.test(s.host));
  if (list.length) await set({ servers: list, fetchedAt: Date.now() });
  return list.length ? list : (servers || []);
}

async function badge(on) {
  const p = on ? 'on' : 'off';
  await api.action.setIcon({ path: { 16: `icons/${p}16.png`, 32: `icons/${p}32.png`, 48: `icons/${p}48.png` } });
  await api.action.setBadgeText({ text: on ? 'ON' : '' });
  if (on) await api.action.setBadgeBackgroundColor({ color: '#30d158' });
}

// Каждый запрос браузера: если VPN включён — отправляем через выбранный сервер, иначе напрямую.
api.proxy.onRequest.addListener(async (details) => {
  const { on, active, servers = [] } = await get(['on', 'active', 'servers']);
  if (!on) return { type: 'direct' };
  const s = servers.find(x => x.id === active);
  if (!s) return { type: 'direct' };
  let host = '';
  try { host = new URL(details.url).hostname; } catch {}
  if (!host || PRIVATE.test(host) || servers.some(x => x.host === host)) return { type: 'direct' };
  return { type: s.scheme === 'http' ? 'http' : 'https', host: s.host, port: +s.port, username: s.username, password: s.password, proxyDNS: true, failoverTimeout: 5 };
}, { urls: ['<all_urls>'] });

api.proxy.onError.addListener((e) => { set({ lastError: String((e && e.message) || e || 'proxy error').slice(0, 160) }); });

async function connect(server) {
  const servers = await loadServers(false);
  const s = typeof server === 'string' ? servers.find(x => x.id === server) : server;
  if (!s) throw new Error('server');
  await set({ on: true, active: s.id, lastError: '' });
  await badge(true);
  return s.id;
}

async function disconnect() {
  await set({ on: false, lastError: '' });
  await badge(false);
}

async function state() {
  const st = await get(['on', 'active', 'lastError']);
  await badge(!!st.on);
  return { on: !!st.on, active: st.active || null, other: false, error: st.lastError || '' };
}

api.runtime.onMessage.addListener((m, _s, send) => {
  (async () => {
    try {
      if (m.type === 'state') send({ ok: true, ...(await state()), servers: await loadServers(false) });
      else if (m.type === 'refresh') send({ ok: true, servers: await loadServers(true) });
      else if (m.type === 'connect') { const id = await connect(m.server); send({ ok: true, active: id }); }
      else if (m.type === 'disconnect') { await disconnect(); send({ ok: true }); }
    } catch (e) { send({ ok: false, error: e.message }); }
  })();
  return true;
});

api.runtime.onInstalled.addListener(() => { loadServers(true); state(); });
api.runtime.onStartup.addListener(() => { state(); });
