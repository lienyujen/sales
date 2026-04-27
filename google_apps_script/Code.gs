const SHEET_USERS = 'users';
const SHEET_DEALS = 'deals';
const PROP_TOKENS = 'sales_tokens';

function doGet(e) {
  return jsonRouter(e, 'GET');
}

function doPost(e) {
  return jsonRouter(e, 'POST');
}

function jsonRouter(e, method) {
  try {
    const action = (e.parameter.action || '').trim();
    const payload = method === 'POST' && e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    const token = (e.parameter.token || '').trim();

    if (action === 'health') return out({ ok: true, status: 'ok', database: 'GoogleSheet' });
    if (action === 'login') return out(login(payload));
    if (action === 'me') return out(requireUser(token));
    if (action === 'users') return out(listUsers(token));
    if (action === 'deals') return out(listDeals(token));
    if (action === 'createDeal') return out(createDeal(token, payload));

    return out({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name);
}

function getTokenMap() {
  const raw = PropertiesService.getScriptProperties().getProperty(PROP_TOKENS);
  return raw ? JSON.parse(raw) : {};
}

function setTokenMap(map) {
  PropertiesService.getScriptProperties().setProperty(PROP_TOKENS, JSON.stringify(map));
}

function login(payload) {
  const users = sheet(SHEET_USERS).getDataRange().getValues();
  const header = users.shift();
  const iUser = header.indexOf('username');
  const iPass = header.indexOf('password');
  const iName = header.indexOf('full_name');
  const iRole = header.indexOf('role');

  const row = users.find(r => String(r[iUser]).toLowerCase() === String(payload.username || '').toLowerCase() && String(r[iPass]) === String(payload.password || ''));
  if (!row) return { ok: false, error: '帳號或密碼錯誤' };

  const token = Utilities.getUuid();
  const map = getTokenMap();
  map[token] = { username: row[iUser], full_name: row[iName], role: row[iRole], ts: Date.now() };
  setTokenMap(map);
  return { ok: true, token, user: { username: row[iUser], full_name: row[iName], role: row[iRole] } };
}

function requireUser(token) {
  const map = getTokenMap();
  const user = map[token];
  if (!user) return { ok: false, error: '未授權' };
  return { ok: true, user: { username: user.username, full_name: user.full_name, role: user.role } };
}

function listUsers(token) {
  const auth = requireUser(token);
  if (!auth.ok) return auth;
  const rows = sheet(SHEET_USERS).getDataRange().getValues();
  const header = rows.shift();
  const users = rows.map(r => ({
    username: r[header.indexOf('username')],
    full_name: r[header.indexOf('full_name')],
    role: r[header.indexOf('role')]
  }));
  return { ok: true, users };
}

function listDeals(token) {
  const auth = requireUser(token);
  if (!auth.ok) return auth;
  const rows = sheet(SHEET_DEALS).getDataRange().getValues();
  const header = rows.shift();
  const deals = rows.map(r => {
    const o = {};
    header.forEach((h, i) => o[h] = r[i]);
    return o;
  });
  return { ok: true, deals };
}

function createDeal(token, payload) {
  const auth = requireUser(token);
  if (!auth.ok) return auth;
  const sh = sheet(SHEET_DEALS);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = header.map((h) => payload[h] || '');
  sh.appendRow(row);
  return { ok: true };
}
