const L = (chrome.i18n.getUILanguage() || 'en').startsWith('ru') ? 'ru' : 'en';
const T = {
  ru: { tag: 'Бесплатно', off: 'Не подключено', on: 'Защита активна', conn: 'Подключаю…', best: 'Подбираю самый быстрый сервер…', pick: 'Нажмите, чтобы включить', onSub: s => 'Сервер: ' + s, lblSrv: 'Сервер', auto: 'Автовыбор (самый быстрый)',
    none: 'Серверы пока недоступны. Попробуйте позже.', other: 'Прокси уже управляется другим расширением. Отключите его и повторите.', fail: 'Не удалось подключиться. Попробуйте другой сервер.', dead: 'нет ответа',
    pt: 'Нужен весь трафик устройства?', pd: 'Приложения Mikaela VPN для Windows и Android: весь трафик, больше серверов и скорость.', bApp: 'Получить приложение', bBot: 'Telegram-бот', priv: 'Конфиденциальность', sup: 'Поддержка' },
  en: { tag: 'Free', off: 'Not connected', on: 'Protected', conn: 'Connecting…', best: 'Finding the fastest server…', pick: 'Click to turn on', onSub: s => 'Server: ' + s, lblSrv: 'Server', auto: 'Auto (fastest)',
    none: 'Servers are unavailable right now. Please try later.', other: 'Another extension controls your proxy. Disable it and try again.', fail: 'Could not connect. Try another server.', dead: 'no reply',
    pt: 'Need your whole device protected?', pd: 'Mikaela VPN apps for Windows and Android: all traffic, more servers and speed.', bApp: 'Get the app', bBot: 'Telegram bot', priv: 'Privacy', sup: 'Support' }
}[L];
const URLS = { app: 'https://cabinet.mikaelavpn.xyz', bot: 'https://t.me/vpnmikaelabot', priv: 'https://github.com/tneange1/Mikaela-VPN-Extension-FireFox/blob/main/PRIVACY.md', sup: 'https://t.me/vpnmikaelabot' };
const $ = id => document.getElementById(id);
const msg = m => new Promise(r => chrome.runtime.sendMessage(m, r));
let S = { on: false, active: null, servers: [] }, choice = 'auto', pings = {}, busy = false;

$('tag').textContent = T.tag; $('lblSrv').textContent = T.lblSrv; $('pt').textContent = T.pt; $('pd').textContent = T.pd;
$('bApp').textContent = T.bApp; $('bBot').textContent = T.bBot; $('fPriv').textContent = T.priv; $('fSup').textContent = T.sup;
const open = u => chrome.tabs.create({ url: u });
$('bApp').onclick = () => open(URLS.app); $('bBot').onclick = () => open(URLS.bot);
$('fPriv').onclick = e => { e.preventDefault(); open(URLS.priv) }; $('fSup').onclick = e => { e.preventDefault(); open(URLS.sup) };

const cls = ms => ms < 0 ? 'r' : ms < 120 ? 'g' : ms < 300 ? 'y' : 'r';
const label = ms => ms == null ? '' : ms < 0 ? T.dead : ms + ' ms';

async function ping(s) { // время TCP+TLS-рукопожатия с прокси-сервером; лучший из двух замеров
  let best = -1;
  for (let i = 0; i < 2; i++) {
    const c = new AbortController(), to = setTimeout(() => c.abort(), 3500), t0 = performance.now();
    try { await fetch(`https://${s.host}:${s.port}/`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: c.signal }); const d = Math.round(performance.now() - t0); best = best < 0 ? d : Math.min(best, d); }
    catch {} finally { clearTimeout(to); }
  }
  return best;
}
async function pingAll() { await Promise.all(S.servers.map(async s => { pings[s.id] = await ping(s); render(); })); }

function render() {
  const cur = S.servers.find(s => s.id === (S.on ? S.active : choice));
  $('power').className = 'power' + (S.on ? ' on' : '') + (busy ? ' busy' : '');
  if (!busy) { $('st').textContent = S.on ? T.on : T.off; $('sub').textContent = S.on && cur ? T.onSub(cur.name) : T.pick; }
  const isAuto = choice === 'auto' && !S.on;
  $('selCc').textContent = isAuto ? '⚡' : (cur ? cur.code : '··'); $('selNm').textContent = isAuto ? T.auto : (cur ? cur.name : T.auto);
  const p = cur && !isAuto ? pings[cur.id] : null; $('selMs').textContent = label(p); $('selMs').className = 'ms ' + (p != null ? cls(p) : '');
  const list = $('list'); list.textContent = '';
  for (const s of [{ id: 'auto', code: '⚡', name: T.auto }, ...S.servers]) {
    const b = document.createElement('button'); b.className = 'it' + (s.id === choice ? ' cur' : ''); b.dataset.id = s.id;
    const cc = document.createElement('span'); cc.className = 'cc'; cc.textContent = s.code;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.name;
    const ms = document.createElement('span'); ms.className = 'ms' + (s.id !== 'auto' && pings[s.id] != null ? ' ' + cls(pings[s.id]) : ''); ms.textContent = s.id === 'auto' ? '' : label(pings[s.id]);
    b.append(cc, nm, ms); list.append(b);
  }
  $('list').querySelectorAll('.it').forEach(b => b.onclick = async () => { choice = b.dataset.id; chrome.storage.local.set({ choice }); $('list').classList.add('hide'); if (S.on) await toggle(true); else render(); });
}
$('sel').onclick = () => { $('list').classList.toggle('hide'); if (!$('list').classList.contains('hide')) pingAll(); };

async function toggle(reconnect) {
  if (busy) return; $('err').textContent = '';
  if (S.on && !reconnect) { busy = true; render(); await msg({ type: 'disconnect' }); busy = false; S.on = false; return render(); }
  if (!S.servers.length) { $('err').textContent = T.none; return; }
  busy = true; $('st').textContent = T.conn; render();
  let id = choice;
  if (id === 'auto') {
    $('sub').textContent = T.best; await pingAll();
    const ok = S.servers.filter(s => pings[s.id] > 0).sort((a, b) => pings[a.id] - pings[b.id]);
    id = (ok[0] || S.servers[0]).id;
  }
  const r = await msg({ type: 'connect', server: id });
  busy = false;
  if (r && r.ok) { S.on = true; S.active = id; } else { S.on = false; $('err').textContent = r && r.error === 'controlled' ? T.other : T.fail; }
  render();
}
$('power').onclick = () => toggle(false);

(async () => {
  const st = await chrome.storage.local.get({ choice: 'auto' }); choice = st.choice;
  const r = await msg({ type: 'state' });
  if (r && r.ok) { S = { on: r.on, active: r.active, servers: r.servers || [] }; if (r.other) $('err').textContent = T.other; }
  if (!S.servers.length) $('err').textContent = T.none;
  if (S.on && S.active) choice = S.active;
  render();
})();
