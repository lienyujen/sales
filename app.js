const TOKEN_KEY = 'sales_force_token';
const API_BASE_CANDIDATES = Array.from(new Set([
  (window.__API_BASE__ || '').replace(/\/$/, ''),
  '',
  'http://localhost:8080'
])).filter((v, i) => (i === 0 ? true : v !== ''));

let activeApiBase = API_BASE_CANDIDATES[0] || '';

const CHANNEL_PRODUCTS = {
  Monitor: ['LCD'],
  EDU: ['IFP', 'PGA'],
  'Pro AV': ['PJ', 'DvLED', 'CDE']
};

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const bases = [activeApiBase, ...API_BASE_CANDIDATES].filter((v, i, arr) => arr.indexOf(v) === i);
  let lastError = null;

  for (const base of bases) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        lastError = new Error(`API 回應不是 JSON（${res.status}，${url}）。`);
        continue;
      }
      if (!res.ok) {
        lastError = new Error(data.error || `API error (${res.status})`);
        if (res.status >= 500 || res.status === 404) continue;
        throw lastError;
      }
      activeApiBase = base;
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('無法連接後端 API，請確認 server.py 已啟動。');
}

function initLoginPage() {
  const loginFormEl = document.getElementById('loginForm');
  if (!loginFormEl) return;

  const loginUsernameEl = document.getElementById('loginUsername');
  const loginPasswordEl = document.getElementById('loginPassword');
  const loginErrorEl = document.getElementById('loginError');
  const apiStatusEl = document.getElementById('apiStatus');

  api('/api/health')
    .then((data) => {
      apiStatusEl.textContent = `系統連線正常：${data.status}（DB: ${data.database}）`;
      apiStatusEl.classList.add('status-ok');
    })
    .catch(() => {
      apiStatusEl.textContent = '系統連線異常：無法連接後端服務，請確認 server.py 已啟動。';
      apiStatusEl.classList.add('status-error');
    });

  loginFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: loginUsernameEl.value.trim(),
          password: loginPasswordEl.value
        })
      });
      setToken(data.token);
      window.location.href = '/dashboard.html';
    } catch (err) {
      loginErrorEl.textContent = err.message;
    }
  });
}

async function initDashboardPage() {
  const dealForm = document.getElementById('dealForm');
  if (!dealForm) return;

  const currentUserEl = document.getElementById('currentUser');
  const logoutBtnEl = document.getElementById('logoutBtn');
  const ownerEl = document.getElementById('owner');
  const channelEl = document.getElementById('channel');
  const productEl = document.getElementById('product');
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

  function renderMetrics(deals) {
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

  function renderTable(deals) {
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

  async function fetchDeals() {
    const params = new URLSearchParams({
      owner: viewOwnerEl.value || 'all',
      channel: viewChannelEl.value || 'all',
      product: viewProductEl.value || 'all'
    });
    const data = await api(`/api/deals?${params.toString()}`);
    return data.deals;
  }

  async function renderAll() {
    const deals = await fetchDeals();
    renderMetrics(deals);
    renderTable(deals);
  }

  const me = await api('/api/me').catch(() => null);
  if (!me) {
    window.location.href = '/';
    return;
  }
  currentUserEl.textContent = `使用者：${me.user.full_name}（${me.user.role}）`;

  const usersData = await api('/api/users');
  const salesMembers = usersData.users.map((u) => u.full_name);
  hydrateSelect(ownerEl, salesMembers);
  hydrateSelect(viewOwnerEl, salesMembers, true);
  ownerEl.value = me.user.full_name;
  viewOwnerEl.value = 'all';

  hydrateSelect(channelEl, Object.keys(CHANNEL_PRODUCTS));
  updateProductOptions(channelEl, productEl);
  channelEl.addEventListener('change', () => updateProductOptions(channelEl, productEl));

  hydrateSelect(viewChannelEl, Object.keys(CHANNEL_PRODUCTS), true);
  hydrateSelect(viewProductEl, Object.values(CHANNEL_PRODUCTS).flat(), true);

  dealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
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

    try {
      await api('/api/deals', { method: 'POST', body: JSON.stringify(payload) });
      dealForm.reset();
      document.getElementById('expectedDate').valueAsDate = new Date();
      channelEl.value = Object.keys(CHANNEL_PRODUCTS)[0];
      updateProductOptions(channelEl, productEl);
      await renderAll();
    } catch (err) {
      alert(err.message);
    }
  });

  [viewOwnerEl, viewPeriodEl, viewChannelEl, viewProductEl].forEach((el) => el.addEventListener('change', renderAll));

  logoutBtnEl.addEventListener('click', () => {
    clearToken();
    window.location.href = '/';
  });

  await renderAll();
}

initLoginPage();
initDashboardPage();
