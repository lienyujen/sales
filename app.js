const SALES_MEMBERS = [
  'Chris Wang',
  'Jeffry Yang',
  'Eason Yang',
  'Teddy Wu',
  'Perry Wang',
  'Jolin Zuo',
  'Raymond Shen',
  'Yujen Lien'
];

const USERS = {
  Chris: { fullName: 'Chris Wang', password: '12345678', role: 'manager' },
  Jeffry: { fullName: 'Jeffry Yang', password: '12345678', role: 'manager' },
  Eason: { fullName: 'Eason Yang', password: '12345678', role: 'manager' },
  Teddy: { fullName: 'Teddy Wu', password: '12345678', role: 'manager' },
  Perry: { fullName: 'Perry Wang', password: '12345678', role: 'manager' },
  Jolin: { fullName: 'Jolin Zuo', password: '12345678', role: 'manager' },
  Raymond: { fullName: 'Raymond Shen', password: '12345678', role: 'manager' },
  Yujen: { fullName: 'Yujen Lien', password: '12345678', role: 'manager' }
};

const CHANNEL_PRODUCTS = {
  Monitor: ['LCD'],
  EDU: ['IFP', 'PGA'],
  'Pro AV': ['PJ', 'DvLED', 'CDE']
};

const STORAGE_KEY = 'company-sales-force-deals-v1';
const SESSION_KEY = 'company-sales-force-session-v1';

const seedDeals = [
  { owner: 'Chris Wang', projectName: '屏東IFP', customerName: '屏東教育局', contactName: '屏東人', contactPhone: '', contactEmail: '', channel: 'EDU', product: 'IFP', qty: 10, amount: 5000000, expectedDate: '2026-04-08', status: '成交', winRate: 90, notes: '' },
  { owner: 'Jeffry Yang', projectName: '屏東LCD', customerName: '屏東', contactName: '沈', contactPhone: '', contactEmail: '', channel: 'Monitor', product: 'LCD', qty: 20, amount: 20000000, expectedDate: '2026-01-28', status: '成交', winRate: 80, notes: '' },
  { owner: 'Eason Yang', projectName: '屏東更新', customerName: '屏東', contactName: '沈', contactPhone: '', contactEmail: '', channel: 'EDU', product: 'IFP', qty: 30, amount: 17055998, expectedDate: '2026-01-28', status: '成交', winRate: 85, notes: '' }
];

const loginViewEl = document.getElementById('loginView');
const appViewEl = document.getElementById('appView');
const loginFormEl = document.getElementById('loginForm');
const loginUsernameEl = document.getElementById('loginUsername');
const loginPasswordEl = document.getElementById('loginPassword');
const loginErrorEl = document.getElementById('loginError');
const currentUserEl = document.getElementById('currentUser');
const logoutBtnEl = document.getElementById('logoutBtn');

const ownerEl = document.getElementById('owner');
const channelEl = document.getElementById('channel');
const productEl = document.getElementById('product');
const formEl = document.getElementById('dealForm');
const viewOwnerEl = document.getElementById('viewOwner');
const viewPeriodEl = document.getElementById('viewPeriod');
const viewChannelEl = document.getElementById('viewChannel');
const viewProductEl = document.getElementById('viewProduct');
const metricCardsEl = document.getElementById('metricCards');
const dealRowsEl = document.getElementById('dealRows');

document.getElementById('expectedDate').valueAsDate = new Date();

function hydrateSelect(el, list, includeAll = false) {
  el.innerHTML = '';
  if (includeAll) el.add(new Option('全部', 'all'));
  list.forEach((item) => el.add(new Option(item, item)));
}

function updateProductOptions(channelTarget, productTarget) {
  const products = CHANNEL_PRODUCTS[channelTarget.value] || [];
  hydrateSelect(productTarget, products);
}

function loadDeals() {
  const found = localStorage.getItem(STORAGE_KEY);
  if (!found) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDeals));
    return seedDeals;
  }
  return JSON.parse(found);
}

function saveDeals(deals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

function fmtCurrency(n) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(n);
}

function weekOfYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function groupLabel(dateStr, period) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  if (period === 'week') return `${y}-W${weekOfYear(d)}`;
  if (period === 'month') return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (period === 'quarter') return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (period === 'half') return `${y}-H${d.getMonth() < 6 ? 1 : 2}`;
  if (period === 'year') return `${y}`;
  return '全部';
}

function getFilteredDeals() {
  const deals = loadDeals();
  return deals.filter((d) => {
    if (viewOwnerEl.value !== 'all' && d.owner !== viewOwnerEl.value) return false;
    if (viewChannelEl.value !== 'all' && d.channel !== viewChannelEl.value) return false;
    if (viewProductEl.value !== 'all' && d.product !== viewProductEl.value) return false;
    return true;
  });
}

function renderMetrics() {
  const deals = getFilteredDeals();
  const totalAmount = deals.reduce((s, d) => s + Number(d.amount || 0), 0);
  const wonDeals = deals.filter((d) => d.status === '成交');
  const closedDeals = deals.filter((d) => d.status === '結案');
  const inProgress = deals.filter((d) => !['成交', '結案'].includes(d.status));
  const hitRate = deals.length ? (wonDeals.length / deals.length) * 100 : 0;

  const bucket = {};
  deals.forEach((d) => {
    const k = groupLabel(d.expectedDate, viewPeriodEl.value);
    if (!bucket[k]) bucket[k] = 0;
    bucket[k] += Number(d.amount || 0);
  });

  const trend = Object.entries(bucket)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${fmtCurrency(v)}`)
    .join('、') || '無資料';

  metricCardsEl.innerHTML = [
    ['總成交金額', fmtCurrency(totalAmount), `資料筆數：${deals.length}`],
    ['Funnel Hit Rate', `${hitRate.toFixed(1)}%`, `成交 ${wonDeals.length} / 全部 ${deals.length}`],
    ['正在處理案子', `${inProgress.length} 筆`, `成交 ${wonDeals.length}，結案 ${closedDeals.length}`],
    [`${viewPeriodEl.options[viewPeriodEl.selectedIndex].text} 業績`, trend, '可依業務/Channel/產品切換']
  ].map(([h, v, s]) => `
      <article class="metric-card">
        <h3>${h}</h3>
        <div class="v">${v}</div>
        <div class="s">${s}</div>
      </article>`).join('');
}

function renderTable() {
  const deals = getFilteredDeals();
  dealRowsEl.innerHTML = deals.map((d) => `
    <tr>
      <td>${d.expectedDate}</td>
      <td>${d.owner}</td>
      <td>${d.projectName}</td>
      <td>${d.customerName}</td>
      <td>${d.channel} / ${d.product}</td>
      <td>${d.qty}</td>
      <td>${fmtCurrency(Number(d.amount || 0))}</td>
      <td>${d.winRate}%</td>
      <td><span class="status-chip ${d.status}">${d.status}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="9">尚無資料</td></tr>';
}

function renderAll() {
  renderMetrics();
  renderTable();
}

function bindDataEvents() {
  hydrateSelect(ownerEl, SALES_MEMBERS);
  hydrateSelect(channelEl, Object.keys(CHANNEL_PRODUCTS));
  updateProductOptions(channelEl, productEl);
  channelEl.addEventListener('change', () => updateProductOptions(channelEl, productEl));

  hydrateSelect(viewOwnerEl, SALES_MEMBERS, true);
  hydrateSelect(viewChannelEl, Object.keys(CHANNEL_PRODUCTS), true);
  hydrateSelect(viewProductEl, Object.values(CHANNEL_PRODUCTS).flat(), true);

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      owner: ownerEl.value,
      projectName: document.getElementById('projectName').value,
      customerName: document.getElementById('customerName').value,
      contactName: document.getElementById('contactName').value,
      contactPhone: document.getElementById('contactPhone').value,
      contactEmail: document.getElementById('contactEmail').value,
      channel: channelEl.value,
      product: productEl.value,
      qty: Number(document.getElementById('qty').value),
      amount: Number(document.getElementById('amount').value),
      expectedDate: document.getElementById('expectedDate').value,
      status: document.getElementById('status').value,
      winRate: Number(document.getElementById('winRate').value),
      notes: document.getElementById('notes').value
    };
    const deals = loadDeals();
    deals.unshift(data);
    saveDeals(deals);
    formEl.reset();
    document.getElementById('expectedDate').valueAsDate = new Date();
    channelEl.value = Object.keys(CHANNEL_PRODUCTS)[0];
    updateProductOptions(channelEl, productEl);
    renderAll();
  });

  [viewOwnerEl, viewPeriodEl, viewChannelEl, viewProductEl].forEach((el) => {
    el.addEventListener('change', renderAll);
  });
}

function showApp(session) {
  loginViewEl.classList.add('hidden');
  appViewEl.classList.remove('hidden');
  currentUserEl.textContent = `使用者：${session.fullName}（${session.role}）`;
  ownerEl.value = session.fullName;
  viewOwnerEl.value = 'all';
  renderAll();
}

function showLogin() {
  appViewEl.classList.add('hidden');
  loginViewEl.classList.remove('hidden');
}

function startSession(username) {
  const user = USERS[username];
  const session = { username, fullName: user.fullName, role: user.role };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  showApp(session);
}

function initAuth() {
  const currentSession = sessionStorage.getItem(SESSION_KEY);
  if (currentSession) {
    showApp(JSON.parse(currentSession));
    return;
  }
  showLogin();
}

loginFormEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = loginUsernameEl.value.trim();
  const password = loginPasswordEl.value;
  const found = USERS[username];
  if (!found || found.password !== password) {
    loginErrorEl.textContent = '帳號或密碼錯誤，請確認帳號為名字（不含姓）。';
    return;
  }
  loginErrorEl.textContent = '';
  loginFormEl.reset();
  startSession(username);
});

logoutBtnEl.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

bindDataEvents();
initAuth();
