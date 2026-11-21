(() => {
'use strict';

/* ---------- constants ---------- */
const EXP = [
  ['food', 'Food & Dining', '🍔', '#ff8a5b'], ['groceries', 'Groceries', '🛒', '#5ee0a0'],
  ['transport', 'Transport', '🚕', '#ffd166'], ['shopping', 'Shopping', '🛍️', '#c77dff'],
  ['bills', 'Bills', '💡', '#4cc9f0'], ['rent', 'Rent', '🏠', '#f72585'],
  ['entertainment', 'Fun', '🎬', '#ff6b9a'], ['health', 'Health', '💊', '#80ed99'],
  ['fitness', 'Fitness', '🏋️', '#06d6a0'], ['subscriptions', 'Subscriptions', '📺', '#9d8cff'],
  ['education', 'Education', '📚', '#48bfe3'], ['travel', 'Travel', '✈️', '#f9c74f'],
  ['gifts', 'Gifts', '🎁', '#ff99c8'], ['other', 'Other', '📦', '#8b93a3'],
].map(([id, name, emoji, color]) => ({ id, name, emoji, color, type: 'expense' }));
const INC = [
  ['salary', 'Salary', '💼', '#5ee0a0'], ['freelance', 'Freelance', '💻', '#4cc9f0'],
  ['business', 'Business', '📈', '#ffd166'], ['investments', 'Investments', '💹', '#c77dff'],
  ['gift_in', 'Gifts', '🎁', '#ff99c8'], ['refund', 'Refunds', '↩️', '#80ed99'],
  ['other_in', 'Other', '💰', '#8b93a3'],
].map(([id, name, emoji, color]) => ({ id, name, emoji, color, type: 'income' }));
const CAT = Object.fromEntries([...EXP, ...INC].map(c => [c.id, c]));
const ACCOUNTS = [['upi', 'UPI', '📱'], ['card', 'Card', '💳'], ['cash', 'Cash', '💵'], ['bank', 'Bank', '🏦']];
const ACC = Object.fromEntries(ACCOUNTS.map(([id, name, emoji]) => [id, { id, name, emoji }]));
const GOAL_EMOJI = ['🛟', '💻', '🏖️', '🚗', '🏠', '💍', '🎓', '📱', '🎸', '✈️'];
const CURRENCIES = ['₹', '$', '€', '£', 'AED '];
const FIXED_PACE = ['rent', 'subscriptions', 'fitness']; // fixed costs: no "on pace" warning
const FIXED_INSIGHT = ['rent', 'bills', 'subscriptions'];
const FILTERS = [['all', 'All'], ['expense', 'Expenses'], ['income', 'Income'], ['recurring', '↻ Recurring']];
const KEY = 'budgetly.v1';

/* ---------- date helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const TODAY = iso(new Date());
const ymOf = s => s.slice(0, 7);
const CUR_YM = ymOf(TODAY);
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const dim = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthName = (ym, opts = { month: 'long', year: 'numeric' }) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', opts); };
const yesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); return iso(y); };
const dayLabel = s => {
  if (s === TODAY) return 'Today';
  if (s === yesterday()) return 'Yesterday';
  return parse(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const shortDate = s => parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => {
  const b = new Uint32Array(2);
  crypto.getRandomValues(b);
  return b[0].toString(36) + b[1].toString(36);
};
const catOf = id => CAT[id] || CAT.other;
const selCls = cond => (cond ? 'sel' : '');
const locale = () => (S.currency === '₹' ? 'en-IN' : 'en-US');
const signChar = (n, showPlus) => {
  if (n < 0) return '−';
  return showPlus ? '+' : '';
};
const fmt = (n, sign = false) => signChar(n, sign) + S.currency + Math.round(Math.abs(n)).toLocaleString(locale());
const fmtK = n => {
  const a = Math.abs(n);
  if (S.currency === '₹' && a >= 100000) return S.currency + (a / 100000).toFixed(a >= 1000000 ? 0 : 1).replace(/\.0$/, '') + 'L';
  if (a >= 1000) return S.currency + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return S.currency + Math.round(a);
};
const sum = (list, type) => list.filter(t => !type || t.type === type).reduce((a, t) => a + t.amount, 0);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const levelColor = (used, ok = 'var(--accent)') => {
  if (used > 100) return 'var(--danger)';
  if (used > 85) return 'var(--warn)';
  return ok;
};
const toNumber = v => Number.parseFloat(String(v).replace(/[^\d.]/g, ''));
const groupBy = (list, key) => {
  const out = {};
  for (const item of list) {
    const k = item[key];
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
};

/* ---------- storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

/* ---------- demo data ---------- */
const DEMO = {
  food: ['Swiggy', 'Zomato', 'Saravana Bhavan', 'Starbucks', 'Burger King', 'Chai & snacks', 'Biryani night', 'Office lunch'],
  groceries: ['BigBasket', 'Zepto', 'Blinkit', 'Reliance Fresh', 'More Supermarket'],
  transport: ['Uber', 'Ola', 'Rapido', 'Metro card', 'Petrol'],
  shopping: ['Amazon', 'Myntra', 'Decathlon', 'Flipkart', 'Croma'],
  entertainment: ['PVR movie', 'BookMyShow', 'Bowling', 'Concert tickets'],
};

// Deterministic generator so the sample data looks the same every time (not used for anything security related).
function makeDemoRandom() {
  let r = 7;
  const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  return {
    rand,
    pick: a => a[Math.floor(rand() * a.length)],
    between: (a, b) => Math.round((a + rand() * (b - a)) / 10) * 10,
    day: () => 1 + Math.floor(rand() * 28),
  };
}

function seedMonth(ym, R, add) {
  add(ym, 1, 'income', 'salary', 85000, 'Monthly salary', 'bank', 'r-salary');
  if (R.rand() > 0.35) add(ym, 8 + Math.floor(R.rand() * 15), 'income', 'freelance', R.between(8000, 22000), 'Freelance project', 'bank');
  if (R.rand() > 0.6) add(ym, 20, 'income', 'investments', R.between(1500, 4000), 'Mutual fund dividend', 'bank');
  add(ym, 3, 'expense', 'rent', 18000, 'House rent', 'bank', 'r-rent');
  add(ym, 5, 'expense', 'fitness', 1500, 'Gym membership', 'card', 'r-gym');
  add(ym, 12, 'expense', 'subscriptions', 649, 'Netflix', 'card', 'r-netflix');
  add(ym, 15, 'expense', 'subscriptions', 119, 'Spotify', 'card', 'r-spotify');
  add(ym, 10, 'expense', 'bills', R.between(1400, 2400), 'Electricity bill', 'upi');
  add(ym, 18, 'expense', 'bills', 799, 'Airtel fiber', 'upi', 'r-wifi');
  const plan = [
    ['food', 14 + Math.floor(R.rand() * 8), 150, 900, ['upi', 'upi', 'card', 'cash']],
    ['groceries', 5, 600, 2200, ['upi']],
    ['transport', 10, 80, 450, ['upi', 'cash']],
    ['shopping', 2 + Math.floor(R.rand() * 3), 500, 4500, ['card']],
    ['entertainment', 2, 300, 1400, ['upi']],
  ];
  for (const [cat, count, lo, hi, accts] of plan) {
    for (let k = 0; k < count; k++) add(ym, R.day(), 'expense', cat, R.between(lo, hi), R.pick(DEMO[cat]), R.pick(accts));
  }
  if (R.rand() > 0.5) add(ym, R.day(), 'expense', 'health', R.between(200, 1500), 'Pharmacy');
  if (R.rand() > 0.7) add(ym, R.day(), 'expense', 'gifts', R.between(800, 3000), 'Birthday gift', 'card');
}

function seed() {
  const R = makeDemoRandom();
  const tx = [];
  const add = (ym, day, type, cat, amount, note, acct = 'upi', rid = null) => {
    const d = `${ym}-${pad(Math.min(day, dim(ym)))}`;
    if (d > TODAY) return;
    tx.push({ id: uid(), type, cat, amount, note, acct, date: d, rid, rday: rid ? day : undefined });
  };
  for (let i = -5; i <= 0; i++) seedMonth(addMonths(CUR_YM, i), R, add);
  return {
    currency: '₹',
    tx,
    skip: [],
    budgets: { total: 50000, cats: { food: 8000, groceries: 7000, transport: 3000, shopping: 5000, entertainment: 2000, bills: 3500, rent: 18000, subscriptions: 1000 } },
    goals: [
      { id: uid(), name: 'Emergency fund', emoji: '🛟', target: 200000, saved: 85000 },
      { id: uid(), name: 'New MacBook', emoji: '💻', target: 150000, saved: 42000 },
      { id: uid(), name: 'Goa trip', emoji: '🏖️', target: 30000, saved: 21000 },
    ],
    demo: true,
  };
}

/* ---------- recurring ---------- */
function series() {
  const map = groupBy(S.tx.filter(t => t.rid), 'rid');
  return Object.entries(map).map(([rid, list]) => {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const last = list.at(-1);
    const day = last.rday || parse(list[0].date).getDate();
    return { rid, last, day };
  });
}
const nextDate = (date, day) => { const ym = addMonths(ymOf(date), 1); return `${ym}-${pad(Math.min(day, dim(ym)))}`; };
const isSkipped = (rid, d) => S.skip.includes(`${rid}|${d}`);
function runRecurring() {
  let added = 0;
  for (const s of series()) {
    let d = nextDate(s.last.date, s.day);
    for (let guard = 0; d <= TODAY && guard < 36; guard++) {
      if (!isSkipped(s.rid, d)) {
        S.tx.push({ ...s.last, id: uid(), date: d, auto: true });
        added++;
      }
      d = nextDate(d, s.day);
    }
  }
  if (added) save();
  return added;
}
function upcoming() {
  return series().map(s => {
    let d = nextDate(s.last.date, s.day);
    while (isSkipped(s.rid, d)) d = nextDate(d, s.day);
    return { ...s.last, due: d };
  }).sort((a, b) => a.due.localeCompare(b.due));
}

/* ---------- state ---------- */
let S = load() || seed();
S.skip = S.skip || [];
S.goals = S.goals || [];
S.budgets = S.budgets || { total: 0, cats: {} };
save();
let view = 'home';
let month = CUR_YM;
let filter = 'all';
let query = '';
runRecurring();

const monthTx = ym => S.tx.filter(t => t.date.startsWith(ym));
const byCat = (list, type = 'expense') => {
  const m = {};
  for (const t of list) {
    if (t.type === type) m[t.cat] = (m[t.cat] || 0) + t.amount;
  }
  return Object.entries(m).map(([cat, amt]) => ({ cat: catOf(cat), amt })).sort((a, b) => b.amt - a.amt);
};

/* ---------- small render pieces ---------- */
function txRow(t) {
  const c = catOf(t.cat);
  const acc = ACC[t.acct];
  const accText = acc ? ' · ' + acc.name : '';
  const tag = t.rid ? '<span class="tag">↻ monthly</span>' : '';
  const isIn = t.type === 'income';
  const sign = isIn ? '+' : '−';
  return `<button class="tx" type="button" data-act="edit-tx" data-id="${t.id}" style="--c:${c.color}">
    <span class="em">${c.emoji}</span>
    <span class="mid"><b>${esc(t.note || c.name)}</b><small>${esc(c.name)}${accText}${tag}</small></span>
    <span class="amt num ${isIn ? 'in' : ''}">${sign}${fmt(t.amount)}</span>
  </button>`;
}

function donut(parts, total, centerTop, centerBottom, size = 150) {
  const r = 62;
  const C = 2 * Math.PI * r;
  const gap = parts.length > 1 ? 3 : 0;
  let acc = 0;
  const segs = parts.map(p => {
    const len = total > 0 ? (p.amt / total) * C : 0;
    const s = `<circle cx="75" cy="75" r="${r}" stroke="${p.cat.color}" stroke-dasharray="${Math.max(len - gap, 0.01)} ${C}" stroke-dashoffset="${-acc}"/>`;
    acc += len;
    return s;
  }).join('');
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${r}" stroke="var(--card-2)"/>${segs}</svg>
    <div class="center"><b class="num">${centerTop}</b><small>${centerBottom}</small></div></div>`;
}

function legendItem(p, exp) {
  const emoji = p.cat.emoji ? p.cat.emoji + ' ' : '';
  return `<li><i style="background:${p.cat.color}"></i><span>${emoji}${esc(p.cat.name)}</span><em class="num">${pct(p.amt, exp)}%</em></li>`;
}

function dueRow(u, withCategory) {
  const c = catOf(u.cat);
  const isIn = u.type === 'income';
  const meta = withCategory ? `Next ${shortDate(u.due)} · ${c.name}` : `Due ${shortDate(u.due)}`;
  return `<div class="sub-row tx" style="--c:${c.color}"><span class="em">${c.emoji}</span><span class="mid"><b>${esc(u.note || c.name)}</b><small>${meta}</small></span><span class="amt num ${isIn ? 'in' : ''}">${isIn ? '+' : ''}${fmt(u.amount)}</span></div>`;
}

function catButton(c, selected) {
  return `<button type="button" class="cat ${selCls(selected)}" data-v="${c.id}" style="--c:${c.color}"><span class="e">${c.emoji}</span>${c.name}</button>`;
}

function emptyState(emoji, title, body) {
  return `<div class="empty"><div class="e">${emoji}</div><h3>${title}</h3><p>${body}</p></div>`;
}

/* ---------- render ---------- */
function render() {
  document.querySelectorAll('.tb').forEach(b => b.classList.toggle('sel', b.dataset.tab === view));
  const titles = { home: 'Budgetly', activity: 'Activity', budgets: 'Budgets', insights: 'Insights' };
  $('#title').textContent = titles[view];
  $('#eyebrow').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const lbl = $('#month-label');
  const isPast = month !== CUR_YM;
  lbl.textContent = monthName(month);
  lbl.classList.toggle('past', isPast);
  lbl.title = isPast ? 'Back to this month' : '';
  const v = $('#view');
  v.classList.remove('view');
  const views = { home: homeView, activity: activityView, budgets: budgetsView, insights: insightsView };
  v.innerHTML = views[view]();
  requestAnimationFrame(() => v.classList.add('view'));
  if (view === 'activity') {
    $('#q').value = query;
    renderTxList();
  }
}

/* ---------- home ---------- */
function homeContext() {
  const list = monthTx(month);
  const isCur = month === CUR_YM;
  const today = new Date().getDate();
  return {
    list,
    isCur,
    inc: sum(list, 'income'),
    exp: sum(list, 'expense'),
    total: S.budgets.total || 0,
    daysLeft: isCur ? dim(month) - today + 1 : 0,
    dayN: isCur ? today : dim(month),
  };
}

function heroCard(c) {
  const net = c.inc - c.exp;
  const label = c.isCur ? 'Saved this month so far' : 'Net for ' + monthName(month, { month: 'long' });
  return `<section class="hero">
    <div class="lbl">${label}</div>
    <div class="big num ${net < 0 ? 'neg' : ''}">${fmt(net)}</div>
    <div class="hero-row">
      <div class="hero-pill"><span class="ic in">↓</span><div><small>Income</small><b class="num">${fmt(c.inc)}</b></div></div>
      <div class="hero-pill"><span class="ic out">↑</span><div><small>Expenses</small><b class="num">${fmt(c.exp)}</b></div></div>
    </div>
  </section>`;
}

function budgetCard(c) {
  if (!c.total) {
    return `<section class="card"><div class="card-head"><h3>Set a monthly budget</h3><button class="link" data-act="edit-total">Set</button></div><p class="hint">Know how much is safe to spend every day.</p></section>`;
  }
  const used = pct(c.exp, c.total);
  const left = c.total - c.exp;
  const leftLabel = left >= 0 ? 'left to spend' : 'over budget';
  const safe = c.isCur && left > 0 ? fmt(left / c.daysLeft) : '—';
  return `<section class="card" data-act="go" data-tab="budgets" role="button">
    <div class="budget-top"><div><b class="num">${fmt(Math.abs(left))}</b> <span>${leftLabel}</span></div><span class="num">${used}% of ${fmtK(c.total)}</span></div>
    <div class="progress"><i style="width:${Math.min(used, 100)}%;--c:${levelColor(used)}"></i></div>
    <div class="mini-stats">
      <div><b class="num">${safe}</b><small>Safe per day</small></div>
      <div><b class="num">${fmt(c.exp / Math.max(c.dayN, 1))}</b><small>Avg per day</small></div>
      <div><b class="num">${c.daysLeft}</b><small>Days left</small></div>
    </div>
  </section>`;
}

function whereCard(c) {
  const cats = byCat(c.list);
  let body = '<p class="hint">No expenses this month yet.</p>';
  if (cats.length) {
    const top = cats.slice(0, 5);
    const rest = cats.slice(5).reduce((a, x) => a + x.amt, 0);
    if (rest > 0) top.push({ cat: { name: 'Everything else', color: '#4a5160' }, amt: rest });
    const legend = top.map(p => legendItem(p, c.exp)).join('');
    body = `<div class="donut-wrap">${donut(top, c.exp, fmtK(c.exp), 'spent')}<ul class="legend">${legend}</ul></div>`;
  }
  return `<section class="card">
    <div class="card-head"><h3>Where it went</h3><button class="link" data-act="go" data-tab="insights">Insights</button></div>
    ${body}
  </section>`;
}

function upcomingCard(c) {
  if (!c.isCur) return '';
  const up = upcoming().filter(u => u.type === 'expense').slice(0, 4);
  if (!up.length) return '';
  const rows = up.map(u => dueRow(u, false)).join('');
  return `<section class="card"><div class="card-head"><h3>Upcoming bills</h3><span class="hint" style="margin:0">${fmt(sum(up))}</span></div>${rows}</section>`;
}

function recentCard(c) {
  const recent = [...c.list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const body = recent.length
    ? `<div class="tx-list">${recent.map(txRow).join('')}</div>`
    : `<p class="hint">Nothing recorded in ${monthName(month, { month: 'long' })}.</p>`;
  return `<section class="card">
    <div class="card-head"><h3>Recent</h3><button class="link" data-act="go" data-tab="activity">See all</button></div>
    ${body}
  </section>`;
}

function homeView() {
  if (!S.tx.length) return emptyState('💸', 'No money moves yet', 'Tap + to add your first expense or income.<br>Or load sample data from ⚙︎ Settings.');
  const c = homeContext();
  return heroCard(c) + budgetCard(c) + whereCard(c) + upcomingCard(c) + recentCard(c);
}

/* ---------- activity ---------- */
function filterChip([k, label]) {
  return `<button class="tab ${selCls(filter === k)}" data-act="filter" data-f="${k}">${label}</button>`;
}

function activityView() {
  const list = monthTx(month);
  return `
  <div class="summary">
    <div class="tile"><div class="n num" style="color:var(--inc)">${fmtK(sum(list, 'income'))}</div><div class="l">Income</div></div>
    <div class="tile"><div class="n num" style="color:var(--exp)">${fmtK(sum(list, 'expense'))}</div><div class="l">Expenses</div></div>
    <div class="tile"><div class="n num">${list.length}</div><div class="l">Transactions</div></div>
  </div>
  <div style="height:10px"></div>
  <input class="search" id="q" type="search" placeholder="Search notes, categories…" autocomplete="off">
  <div class="chips-row">${FILTERS.map(filterChip).join('')}</div>
  <div id="tx-list"></div>`;
}

function matchesFilter(t) {
  if (filter === 'expense' || filter === 'income') return t.type === filter;
  if (filter === 'recurring') return Boolean(t.rid);
  return true;
}

function matchesQuery(t, q) {
  if (!q) return true;
  const c = catOf(t.cat);
  return (t.note || '').toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || String(t.amount).includes(q);
}

function dayGroup([d, ts]) {
  const net = sum(ts, 'income') - sum(ts, 'expense');
  return `<div class="day-title"><span>${dayLabel(d)}</span><span class="num">${fmt(net, true)}</span></div><div class="day-group tx-list">${ts.map(txRow).join('')}</div>`;
}

function renderTxList() {
  const el = $('#tx-list');
  if (!el) return;
  const q = query.trim().toLowerCase();
  const list = monthTx(month)
    .filter(t => matchesFilter(t) && matchesQuery(t, q))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) {
    const msg = q ? 'No matches for that search.' : 'No transactions for this filter.';
    el.innerHTML = emptyState('🔍', 'Nothing here', msg);
    return;
  }
  el.innerHTML = Object.entries(groupBy(list, 'date')).map(dayGroup).join('');
}

/* ---------- budgets ---------- */
function budgetStatus(catId, lim, spent, pace) {
  if (spent > lim) return { text: `${fmt(spent - lim)} over budget`, cls: 'over' };
  const base = `${fmt(Math.max(lim - spent, 0))} left`;
  if (pace !== null && !FIXED_PACE.includes(catId) && pace > lim * 1.05) {
    return { text: `${base} · on pace to spend ${fmt(pace)}`, cls: 'warn' };
  }
  return { text: base, cls: '' };
}

function catBudgetRow(c, spentMap, elapsed) {
  const lim = S.budgets.cats[c.id];
  const s = spentMap[c.id] || 0;
  const p = pct(s, lim);
  const pace = elapsed < 1 ? s / Math.max(elapsed, 0.01) : null;
  const st = budgetStatus(c.id, lim, s, pace);
  return `<button class="b-row" type="button" data-act="edit-cat-budget" data-cat="${c.id}" style="--c:${c.color}">
    <div class="b-line"><span class="em">${c.emoji}</span><span class="nm">${c.name}</span><span class="vals num"><b>${fmt(s)}</b> / ${fmtK(lim)}</span></div>
    <div class="progress thin"><i style="width:${Math.min(p, 100)}%;--c:${levelColor(p, c.color)}"></i></div>
    <div class="status ${st.cls}">${st.text}</div></button>`;
}

function unbudgetedRow(c, spentMap) {
  return `<button class="b-row" type="button" data-act="edit-cat-budget" data-cat="${c.id}" style="--c:${c.color}"><div class="b-line" style="margin:0"><span class="em">${c.emoji}</span><span class="nm">${c.name}</span><span class="vals num"><b>${fmt(spentMap[c.id])}</b> · <span style="color:var(--accent)">Set limit</span></span></div></button>`;
}

function totalBudgetCard(exp) {
  const total = S.budgets.total || 0;
  let body = '<p class="hint">No overall budget yet. Tap to set one.</p>';
  if (total) {
    const used = pct(exp, total);
    const ring = donut([{ cat: { color: levelColor(used) }, amt: Math.min(exp, total) }], total, used + '%', 'used', 120);
    const leftText = exp <= total ? fmt(total - exp) + ' left' : fmt(exp - total) + ' over';
    const catSum = Object.values(S.budgets.cats).reduce((a, b) => a + b, 0);
    const split = catSum ? '<br>' + fmt(catSum) + ' split across categories' : '';
    body = `<div class="donut-wrap">${ring}<div><div class="budget-top" style="display:block"><b class="num">${fmt(exp)}</b> <span>of ${fmt(total)}</span></div><p class="hint">${leftText}${split}</p></div></div>`;
  }
  return `<section class="card" data-act="edit-total" role="button"><div class="card-head"><h3>Monthly budget</h3><span class="link">Edit</span></div>${body}</section>`;
}

function goalCard(g) {
  const p = Math.min(pct(g.saved, g.target), 100);
  const C = 2 * Math.PI * 24;
  return `<button class="goal" type="button" data-act="edit-goal" data-id="${g.id}">
    <div class="ring"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" stroke="var(--line)"/><circle cx="28" cy="28" r="24" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="${(p / 100) * C} ${C}"/></svg><span>${g.emoji}</span></div>
    <b>${esc(g.name)}</b><small class="num">${fmtK(g.saved)} of ${fmtK(g.target)} · ${p}%</small>
    <div class="progress thin" style="margin-top:8px"><i style="width:${p}%"></i></div></button>`;
}

function budgetsView() {
  const list = monthTx(month);
  const exp = sum(list, 'expense');
  const spentMap = Object.fromEntries(byCat(list).map(x => [x.cat.id, x.amt]));
  const elapsed = month === CUR_YM ? new Date().getDate() / dim(month) : 1;
  const withBudget = EXP.filter(c => S.budgets.cats[c.id]);
  const unbudgeted = EXP.filter(c => !S.budgets.cats[c.id] && spentMap[c.id]);
  const catRows = withBudget.length
    ? withBudget.map(c => catBudgetRow(c, spentMap, elapsed)).join('')
    : '<p class="hint" style="padding:12px 0">No category budgets yet.</p>';
  const subs = upcoming();
  const subOut = sum(subs, 'expense');
  const subRows = subs.length
    ? subs.map(s => dueRow(s, true)).join('')
    : '<p class="hint" style="padding:10px 0">Turn on "Repeat monthly" when adding rent, salary or subscriptions — they\'ll add themselves each month.</p>';

  return `${totalBudgetCard(exp)}
  <div class="section-label">Categories</div>
  <section class="card" style="padding-top:4px;padding-bottom:4px">
    ${catRows}${unbudgeted.map(c => unbudgetedRow(c, spentMap)).join('')}
  </section>
  <button class="link" data-act="add-cat-budget" style="margin:0 4px">+ Add category budget</button>

  <div class="section-label">Savings goals</div>
  <div class="goals">${S.goals.map(goalCard).join('')}<button class="goal add" type="button" data-act="new-goal">+ New goal</button></div>

  <div class="section-label">Recurring · ${fmt(subOut)}/mo out</div>
  <section class="card" style="padding-top:6px;padding-bottom:6px">${subRows}</section>`;
}

/* ---------- insights ---------- */
const CHART_W = 320;

function cashFlowChart() {
  const H = 140;
  const bw = 14;
  const slot = CHART_W / 6;
  const data = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    const l = monthTx(m);
    return { m, inc: sum(l, 'income'), exp: sum(l, 'expense') };
  });
  const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp)));
  const bars = data.map((d, i) => {
    const x = i * slot + slot / 2;
    const hi = (d.inc / max) * H;
    const he = (d.exp / max) * H;
    const isSel = d.m === month;
    const op = isSel ? 1 : 0.55;
    const lblStyle = isSel ? 'style="fill:var(--text);font-weight:700"' : '';
    return `<rect x="${x - bw - 2}" y="${H - hi}" width="${bw}" height="${Math.max(hi, 1.5)}" rx="4" fill="var(--inc)" opacity="${op}"/>
      <rect x="${x + 2}" y="${H - he}" width="${bw}" height="${Math.max(he, 1.5)}" rx="4" fill="var(--exp)" opacity="${op}"/>
      <text x="${x}" y="${H + 16}" text-anchor="middle" ${lblStyle}>${monthName(d.m, { month: 'short' })}</text>`;
  }).join('');
  const grid = [0.5, 1].map(f => `<line x1="0" x2="${CHART_W}" y1="${H - f * H}" y2="${H - f * H}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${CHART_W}" y="${H - f * H - 4}" text-anchor="end">${fmtK(max * f)}</text>`).join('');
  return `<section class="card chart">
    <div class="card-head"><h3>Cash flow</h3><span class="hint" style="margin:0">6 months</span></div>
    <svg viewBox="0 -8 ${CHART_W} ${H + 26}">${grid}${bars}</svg>
    <div class="legend-inline"><span><i style="background:var(--inc)"></i>Income</span><span><i style="background:var(--exp)"></i>Expenses</span></div>
  </section>`;
}

function dailySpend(list) {
  const daily = new Array(dim(month)).fill(0);
  for (const t of list) {
    if (t.type === 'expense' && t.cat !== 'rent') daily[parse(t.date).getDate() - 1] += t.amount;
  }
  return daily;
}

function dayFill(i, v, dayN, avg) {
  if (i + 1 > dayN) return 'var(--card-2)';
  if (v > avg * 1.6) return 'var(--exp)';
  return 'var(--accent)';
}

function dailyChart(daily, dayN, avg) {
  const days = daily.length;
  const dmax = Math.max(1, ...daily);
  const dw = CHART_W / days;
  const bars = daily.map((v, i) => {
    const h = (v / dmax) * 90;
    const height = v ? Math.max(h, 2) : 0;
    return `<rect x="${i * dw + 1}" y="${90 - h}" width="${Math.max(dw - 2, 1)}" height="${height}" rx="2" fill="${dayFill(i, v, dayN, avg)}"/>`;
  }).join('');
  const avgY = 90 - (avg / dmax) * 90;
  return `<section class="card chart">
    <div class="card-head"><h3>Daily spending</h3><span class="hint num" style="margin:0">avg ${fmt(avg)}/day</span></div>
    <svg viewBox="0 0 ${CHART_W} 108">${bars}<line x1="0" x2="${CHART_W}" y1="${avgY}" y2="${avgY}" stroke="var(--muted)" stroke-dasharray="4 4"/>
      <text x="0" y="104">1</text><text x="${CHART_W / 2}" y="104" text-anchor="middle">${Math.round(days / 2)}</text><text x="${CHART_W}" y="104" text-anchor="end">${days}</text></svg>
    <p class="hint">Rent left out so your day-to-day shows. Red bars are spikes above 1.6× your average.</p>
  </section>`;
}

function categoryRow(c, exp, topAmt) {
  return `<div class="b-row" style="--c:${c.cat.color}"><div class="b-line"><span class="em">${c.cat.emoji}</span><span class="nm">${c.cat.name}</span><span class="vals num"><b>${fmt(c.amt)}</b> · ${pct(c.amt, exp)}%</span></div><div class="progress thin"><i style="width:${pct(c.amt, topAmt)}%"></i></div></div>`;
}

function trendInsight(exp, prevToDate, isCur) {
  if (prevToDate <= 0) return null;
  const ch = Math.round(((exp - prevToDate) / prevToDate) * 100);
  const prevName = monthName(addMonths(month, -1), { month: 'long' });
  const suffix = isCur ? ' by this date' : '';
  if (ch <= 0) return ['📉', `${Math.abs(ch)}% less spending`, `You've spent ${fmt(prevToDate - exp)} less than ${prevName}${suffix}. Nice.`];
  return ['📈', `${ch}% more spending`, `${fmt(exp - prevToDate)} more than ${prevName}${suffix}.`];
}

function savingsInsight(inc, exp) {
  if (inc <= 0) return null;
  const rate = Math.round(((inc - exp) / inc) * 100);
  const body = rate >= 20
    ? `You're keeping ${fmt(inc - exp)} of what came in. 20%+ is a strong habit.`
    : `You kept ${fmt(Math.max(inc - exp, 0))}. Aim for 20% — that's ${fmt(inc * 0.2)} this month.`;
  return ['🏦', `Savings rate ${rate}%`, body];
}

function leaderInsight(cats, list, prev, exp) {
  const lead = cats.find(c => !FIXED_INSIGHT.includes(c.cat.id));
  if (!lead) return null;
  const prevAmt = byCat(prev).find(x => x.cat.id === lead.cat.id)?.amt || 0;
  const prevText = prevAmt ? ' (' + fmt(prevAmt) + ' last month)' : '';
  const count = list.filter(t => t.cat === lead.cat.id).length;
  return [lead.cat.emoji, `${lead.cat.name} leads at ${pct(lead.amt, exp)}%`, `${fmt(lead.amt)} across ${count} transactions${prevText}.`];
}

function biggestInsight(list) {
  const biggest = list.filter(t => t.type === 'expense' && t.cat !== 'rent').sort((a, b) => b.amount - a.amount)[0];
  if (!biggest) return null;
  return ['💥', 'Biggest one-off', `${esc(biggest.note || catOf(biggest.cat).name)} — ${fmt(biggest.amount)} on ${shortDate(biggest.date)}.`];
}

function noSpendInsight(daily, dayN) {
  const n = daily.slice(0, dayN).filter(v => v === 0).length;
  const plural = n === 1 ? '' : 's';
  const body = n ? 'Days with zero spending (rent excluded). Keep the streak going.' : 'Try one no-spend day this week — it adds up fast.';
  return ['🧘', `${n} no-spend day${plural}`, body];
}

function subscriptionInsight() {
  const subs = upcoming().filter(s => s.type === 'expense' && s.cat === 'subscriptions');
  if (!subs.length) return null;
  return ['📺', `${fmt(sum(subs) * 12)} a year on subscriptions`, `${subs.map(s => esc(s.note)).join(', ')}. Still using them all?`];
}

function insightCard([e, t, p]) {
  return `<div class="insight"><span class="em">${e}</span><div><b>${t}</b><p>${p}</p></div></div>`;
}

function insightsView() {
  const list = monthTx(month);
  const inc = sum(list, 'income');
  const exp = sum(list, 'expense');
  const prev = monthTx(addMonths(month, -1));
  const isCur = month === CUR_YM;
  const dayN = isCur ? new Date().getDate() : dim(month);
  // compare with the same point in the previous month, so early-month numbers are fair
  const prevToDate = isCur ? sum(prev.filter(t => parse(t.date).getDate() <= dayN), 'expense') : sum(prev, 'expense');
  const daily = dailySpend(list);
  const avg = daily.slice(0, dayN).reduce((a, b) => a + b, 0) / Math.max(dayN, 1);
  const cats = byCat(list);
  const catRows = cats.length ? cats.map(c => categoryRow(c, exp, cats[0].amt)).join('') : '<p class="hint">No expenses yet.</p>';
  const insights = [
    trendInsight(exp, prevToDate, isCur),
    savingsInsight(inc, exp),
    leaderInsight(cats, list, prev, exp),
    biggestInsight(list),
    noSpendInsight(daily, dayN),
    subscriptionInsight(),
  ].filter(Boolean);

  return `${cashFlowChart()}${dailyChart(daily, dayN, avg)}
  <section class="card"><div class="card-head"><h3>By category</h3></div>${catRows}</section>
  <div class="section-label">Smart insights</div>
  <div class="insights">${insights.map(insightCard).join('')}</div>`;
}

/* ---------- sheets ---------- */
function openSheet(html, small = false) {
  const root = $('#sheet-root');
  const grabber = small ? '' : '<div class="grabber"></div>';
  root.innerHTML = `<div class="sheet-backdrop" id="bd"><div class="sheet ${small ? 'small' : ''}" role="dialog" aria-modal="true">${grabber}${html}</div></div>`;
  document.body.classList.add('lock');
  $('#bd').addEventListener('click', e => {
    if (e.target.id === 'bd' || e.target.closest('[data-close]')) closeSheet();
  });
  return root.querySelector('.sheet');
}
function closeSheet() {
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('lock');
}
function finish(msg) {
  save();
  closeSheet();
  render();
  if (msg) toast(msg);
}

function accountButton([id, name, emoji]) {
  return `<button type="button" class="seg" data-v="${id}"><span class="e">${emoji}</span>${name}</button>`;
}

function txSheetHtml(st, editing) {
  const actions = editing
    ? '<div class="sheet-actions"><button type="button" class="danger" id="a-del">Delete</button><button type="button" class="ghost" data-close>Cancel</button></div>'
    : '';
  return `
    <div class="segment type" id="a-type">
      <button type="button" class="seg exp" data-v="expense">Expense</button>
      <button type="button" class="seg inc" data-v="income">Income</button>
    </div>
    <div class="amount-box"><span class="cur">${S.currency}</span><input id="a-amt" inputmode="decimal" placeholder="0" value="${st.amount || ''}" aria-label="Amount"></div>
    <div class="field"><span>Category</span><div class="cat-grid" id="a-cats"></div></div>
    <div class="field"><span>Paid with</span><div class="segment acct" id="a-acct">${ACCOUNTS.map(accountButton).join('')}</div></div>
    <div class="field"><span>Date</span>
      <div class="date-row" id="a-dates">
        <button type="button" class="dchip" data-off="0">Today</button>
        <button type="button" class="dchip" data-off="-1">Yesterday</button>
        <input type="date" id="a-date" value="${st.date}" max="${TODAY}" aria-label="Pick a date">
      </div>
    </div>
    <label class="field"><span>Note</span><input id="a-note" maxlength="40" placeholder="e.g. Swiggy, rent, salary" value="${esc(st.note)}" enterkeyhint="done"></label>
    <div class="field"><label class="switch-row"><input type="checkbox" id="a-rec" ${st.rid ? 'checked' : ''}><span>Repeat monthly <span class="hint">(rent, salary, subscriptions)</span></span></label></div>
    <button type="button" class="primary wide" id="a-save">${editing ? 'Save changes' : 'Add'}</button>
    ${actions}`;
}

const repeatDay = (rid, date) => (rid ? parse(date).getDate() : undefined);

function addTx(fields, repeat) {
  const rid = repeat ? 'r-' + uid() : null;
  S.tx.push({ id: uid(), ...fields, rid, rday: repeatDay(rid, fields.date) });
}

function updateTx(id, fields, repeat) {
  const i = S.tx.findIndex(x => x.id === id);
  const old = S.tx[i];
  let rid = old.rid || null;
  if (repeat && !rid) rid = 'r-' + uid();
  if (!repeat && old.rid) {
    // turning repeat off stops the whole series
    S.tx.forEach(x => { if (x.rid === old.rid) x.rid = null; });
    rid = null;
  }
  S.tx[i] = { ...old, ...fields, rid, rday: repeatDay(rid, fields.date) };
}

function saveTx(original, st) {
  const amount = Math.round(toNumber($('#a-amt').value) * 100) / 100;
  if (!amount || amount <= 0) {
    $('#a-amt').focus();
    toast('Enter an amount');
    return;
  }
  const date = $('#a-date').value || TODAY;
  const repeat = $('#a-rec').checked;
  const fields = { type: st.type, cat: st.cat, acct: st.acct, amount, date, note: $('#a-note').value.trim() };
  if (original) updateTx(original.id, fields, repeat);
  else addTx(fields, repeat);
  const repeats = runRecurring();
  if (ymOf(date) <= CUR_YM) month = ymOf(date);
  const kind = st.type === 'income' ? 'Income' : 'Expense';
  const extra = repeats ? ` (+${repeats} repeats)` : '';
  finish(original ? 'Saved' : kind + ' added' + extra);
}

function deleteTx(t) {
  if (t.rid) S.skip.push(`${t.rid}|${t.date}`);
  S.tx = S.tx.filter(x => x.id !== t.id);
  finish('Deleted');
}

function txSheet(t) {
  const editing = Boolean(t);
  const st = t ? { ...t } : { type: 'expense', cat: 'food', acct: 'upi', date: month === CUR_YM ? TODAY : `${month}-01`, amount: '', note: '', rid: null };
  const sheet = openSheet(txSheetHtml(st, editing));
  const paint = () => {
    sheet.querySelectorAll('#a-type .seg').forEach(b => b.classList.toggle('sel', b.dataset.v === st.type));
    sheet.querySelectorAll('#a-acct .seg').forEach(b => b.classList.toggle('sel', b.dataset.v === st.acct));
    const cats = st.type === 'expense' ? EXP : INC;
    if (!cats.some(c => c.id === st.cat)) st.cat = cats[0].id;
    $('#a-cats').innerHTML = cats.map(c => catButton(c, c.id === st.cat)).join('');
  };
  const paintDates = () => {
    const v = $('#a-date').value;
    const y = yesterday();
    sheet.querySelectorAll('#a-dates .dchip').forEach(b => b.classList.toggle('sel', v === (b.dataset.off === '0' ? TODAY : y)));
  };
  paint();
  paintDates();
  $('#a-date').addEventListener('change', paintDates);
  sheet.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.closest('#a-dates')) {
      $('#a-date').value = b.dataset.off === '0' ? TODAY : yesterday();
      paintDates();
      return;
    }
    if (b.closest('#a-type')) st.type = b.dataset.v;
    else if (b.closest('#a-acct')) st.acct = b.dataset.v;
    else if (b.closest('#a-cats')) st.cat = b.dataset.v;
    else return;
    paint();
  });
  const amt = $('#a-amt');
  const fit = () => { amt.style.width = Math.max(1, amt.value.length) * 0.68 + 0.3 + 'em'; };
  amt.addEventListener('input', () => {
    amt.value = amt.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    fit();
  });
  fit();
  if (!editing) setTimeout(() => amt.focus(), 250);
  $('#a-save').addEventListener('click', () => saveTx(t, st));
  if (editing) $('#a-del').addEventListener('click', () => deleteTx(t));
}

function numberSheet({ title, label, value, hint, onSave, onRemove }) {
  const hintHtml = hint ? `<p class="hint">${hint}</p>` : '';
  const removeBtn = onRemove ? '<button type="button" class="danger" id="n-rm">Remove</button>' : '';
  openSheet(`<h2>${title}</h2>
    <label class="field"><span>${label}</span><input id="n-val" inputmode="decimal" enterkeyhint="done" value="${value || ''}" placeholder="0"></label>
    ${hintHtml}
    <div class="sheet-actions">${removeBtn}<button type="button" class="ghost" data-close>Cancel</button><button type="button" class="primary" id="n-ok">Save</button></div>`, true);
  const inp = $('#n-val');
  setTimeout(() => { inp.focus(); inp.select(); }, 150);
  const go = () => {
    const v = toNumber(inp.value);
    if (Number.isNaN(v) || v < 0) {
      inp.focus();
      return;
    }
    onSave(v);
    finish();
  };
  $('#n-ok').addEventListener('click', go);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  if (onRemove) {
    $('#n-rm').addEventListener('click', () => {
      onRemove();
      finish();
    });
  }
}

function pickCategorySheet() {
  const free = EXP.filter(c => !S.budgets.cats[c.id]);
  if (!free.length) {
    toast('Every category has a budget');
    return;
  }
  openSheet(`<h2>Budget a category</h2><div class="cat-grid">${free.map(c => catButton(c, false)).join('')}</div>
    <div class="sheet-actions"><button type="button" class="ghost" data-close>Cancel</button></div>`);
  $('#sheet-root .cat-grid').addEventListener('click', e => {
    const b = e.target.closest('.cat');
    if (b) catBudgetSheet(b.dataset.v);
  });
}

function catBudgetSheet(id) {
  const c = CAT[id];
  const avg3 = [1, 2, 3].map(i => sum(monthTx(addMonths(CUR_YM, -i)).filter(t => t.cat === id), 'expense')).reduce((a, b) => a + b, 0) / 3;
  const hasLimit = Boolean(S.budgets.cats[id]);
  numberSheet({
    title: `${c.emoji} ${c.name}`,
    label: 'Monthly limit',
    value: S.budgets.cats[id],
    hint: avg3 ? `You've averaged ${fmt(avg3)}/month here over the last 3 months.` : '',
    onSave: v => {
      if (v > 0) S.budgets.cats[id] = v;
      else delete S.budgets.cats[id];
    },
    onRemove: hasLimit ? () => { delete S.budgets.cats[id]; } : null,
  });
}

function goalProgressHtml(g) {
  const p = pct(g.saved, g.target);
  const status = g.saved >= g.target ? '🎉 Goal reached!' : fmt(g.target - g.saved) + ' to go';
  return `<div class="card" style="background:var(--card-2)"><div class="budget-top"><div><b class="num">${fmt(g.saved)}</b> <span>saved</span></div><span class="num">${p}%</span></div>
      <div class="progress"><i style="width:${Math.min(p, 100)}%"></i></div><p class="hint">${status}</p></div>
    <label class="field"><span>Add money</span><div class="row2"><input id="g-add" inputmode="decimal" enterkeyhint="done" placeholder="Amount"><button type="button" class="primary" id="g-add-btn">+ Add</button></div></label>`;
}

function emojiChip(e, selected) {
  return `<button type="button" class="chip ${selCls(selected)}" data-v="${e}">${e}</button>`;
}

function goalSheet(g) {
  const editing = Boolean(g);
  const st = g ? { ...g } : { emoji: '🛟', name: '', target: '', saved: 0 };
  const heading = editing ? esc(g.name) : 'New savings goal';
  const progress = editing ? goalProgressHtml(g) : '';
  const delBtn = editing ? '<button type="button" class="danger" id="g-del">Delete</button>' : '';
  const sheet = openSheet(`<h2>${heading}</h2>${progress}
    <label class="field"><span>Name</span><input id="g-name" maxlength="30" placeholder="e.g. Emergency fund" value="${esc(st.name)}"></label>
    <div class="field"><span>Icon</span><div class="chips" id="g-emoji">${GOAL_EMOJI.map(e => emojiChip(e, e === st.emoji)).join('')}</div></div>
    <div class="row2">
      <label class="field"><span>Target</span><input id="g-target" inputmode="decimal" value="${st.target || ''}" placeholder="0"></label>
      <label class="field"><span>Saved so far</span><input id="g-saved" inputmode="decimal" value="${st.saved || ''}" placeholder="0"></label>
    </div>
    <div class="sheet-actions">${delBtn}<button type="button" class="ghost" data-close>Cancel</button><button type="button" class="primary" id="g-save">Save</button></div>`);
  sheet.querySelector('#g-emoji').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    st.emoji = b.dataset.v;
    sheet.querySelectorAll('#g-emoji .chip').forEach(x => x.classList.toggle('sel', x === b));
  });
  $('#g-save').addEventListener('click', () => {
    const name = $('#g-name').value.trim();
    const target = toNumber($('#g-target').value) || 0;
    const saved = toNumber($('#g-saved').value) || 0;
    if (!name || !target) {
      toast('Add a name and target');
      return;
    }
    if (editing) Object.assign(S.goals.find(x => x.id === g.id), { name, target, saved, emoji: st.emoji });
    else S.goals.push({ id: uid(), name, target, saved, emoji: st.emoji });
    finish();
  });
  if (!editing) return;
  $('#g-add-btn').addEventListener('click', () => {
    const v = toNumber($('#g-add').value);
    if (Number.isNaN(v) || v <= 0) return;
    const goal = S.goals.find(x => x.id === g.id);
    goal.saved += v;
    finish(goal.saved >= goal.target ? '🎉 Goal reached!' : `${fmt(v)} added to ${goal.name}`);
  });
  $('#g-del').addEventListener('click', () => {
    S.goals = S.goals.filter(x => x.id !== g.id);
    finish();
  });
}

/* ---------- settings ---------- */
function currencyButton(c) {
  return `<button type="button" class="seg ${selCls(S.currency === c)}" data-v="${c}">${c.trim()}</button>`;
}

function showCopyBox(text) {
  $('#s-imp-wrap').classList.remove('hidden');
  $('#s-text').value = text;
  $('#s-text').select();
  toast('Select all & copy');
}

function copyText(text, okMsg) {
  navigator.clipboard.writeText(text).then(() => toast(okMsg), () => showCopyBox(text));
}

function toCsv() {
  const header = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note', 'Recurring'];
  const rows = [...S.tx]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => [t.date, t.type, catOf(t.cat).name, ACC[t.acct]?.name || '', t.amount, t.note || '', t.rid ? 'monthly' : '']);
  const cell = v => '"' + String(v).replaceAll('"', '""') + '"';
  return [header, ...rows].map(r => r.map(cell).join(',')).join('\n');
}

function restoreBackup() {
  try {
    const d = JSON.parse($('#s-text').value);
    if (!Array.isArray(d.tx)) throw new Error('Backup has no transactions');
    S = { skip: [], goals: [], budgets: { total: 0, cats: {} }, ...d };
    finish('Restored');
  } catch {
    toast("That backup didn't look right");
  }
}

function settingsSheet() {
  openSheet(`<h2>Settings</h2>
    <div class="field"><span>Currency</span><div class="segment" id="s-cur">${CURRENCIES.map(currencyButton).join('')}</div></div>
    <div class="section-label" style="margin-left:0">Your data</div>
    <p class="hint">Everything stays on this device. Copy a backup now and then.</p>
    <div class="sheet-actions left">
      <button type="button" class="ghost" id="s-export">Copy backup</button>
      <button type="button" class="ghost" id="s-import">Restore backup</button>
      <button type="button" class="ghost" id="s-csv">Copy as CSV</button>
    </div>
    <div class="field hidden" id="s-imp-wrap" style="margin-top:10px"><textarea id="s-text" rows="5" placeholder="Paste your backup here"></textarea><button type="button" class="primary" id="s-import-go" style="margin-top:8px">Restore</button></div>
    <div class="section-label" style="margin-left:0">Start over</div>
    <div class="sheet-actions left">
      <button type="button" class="ghost" id="s-demo">Load sample data</button>
      <button type="button" class="danger" id="s-clear" style="margin-right:0">Erase everything</button>
    </div>
    <div class="sheet-actions"><button type="button" class="primary" data-close>Done</button></div>`);
  $('#s-cur').addEventListener('click', e => {
    const b = e.target.closest('.seg');
    if (!b) return;
    S.currency = b.dataset.v;
    save();
    settingsSheet();
    render();
  });
  $('#s-export').addEventListener('click', () => copyText(JSON.stringify(S), 'Backup copied'));
  $('#s-import').addEventListener('click', () => {
    $('#s-imp-wrap').classList.remove('hidden');
    $('#s-text').value = '';
    $('#s-text').focus();
  });
  $('#s-import-go').addEventListener('click', restoreBackup);
  $('#s-csv').addEventListener('click', () => copyText(toCsv(), 'CSV copied — paste into Sheets'));
  $('#s-demo').addEventListener('click', () => confirmSheet('Load sample data?', 'This replaces what you have now with 6 months of example transactions.', 'Load', () => {
    S = seed();
    runRecurring();
    month = CUR_YM;
    finish('Sample data loaded');
  }));
  $('#s-clear').addEventListener('click', () => confirmSheet('Erase everything?', 'All transactions, budgets and goals will be deleted from this device. This cannot be undone.', 'Erase', () => {
    S = { currency: S.currency, tx: [], skip: [], budgets: { total: 0, cats: {} }, goals: [] };
    month = CUR_YM;
    finish('Erased');
  }));
}

function confirmSheet(title, body, ok, fn) {
  openSheet(`<h2>${title}</h2><p class="hint">${body}</p><div class="sheet-actions"><button type="button" class="ghost" data-close>Cancel</button><button type="button" class="danger" id="c-ok" style="margin-right:0">${ok}</button></div>`, true);
  $('#c-ok').addEventListener('click', () => {
    closeSheet();
    fn();
  });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 1900);
}

/* ---------- events ---------- */
function goTo(tab) {
  view = tab;
  render();
  window.scrollTo({ top: 0 });
}

const ACTIONS = {
  month: el => {
    const n = addMonths(month, Number(el.dataset.d));
    if (n > CUR_YM) {
      toast("Can't see the future yet");
      return;
    }
    month = n;
    render();
  },
  'month-today': () => { month = CUR_YM; render(); },
  go: el => goTo(el.dataset.tab),
  'edit-tx': el => txSheet(S.tx.find(t => t.id === el.dataset.id)),
  filter: el => {
    filter = el.dataset.f;
    document.querySelectorAll('[data-act=filter]').forEach(b => b.classList.toggle('sel', b === el));
    renderTxList();
  },
  'edit-total': () => numberSheet({
    title: 'Monthly budget',
    label: 'Total you want to spend each month',
    value: S.budgets.total,
    hint: 'Everything counts toward this, including rent and bills.',
    onSave: v => { S.budgets.total = v; },
  }),
  'edit-cat-budget': el => catBudgetSheet(el.dataset.cat),
  'add-cat-budget': () => pickCategorySheet(),
  'edit-goal': el => goalSheet(S.goals.find(g => g.id === el.dataset.id)),
  'new-goal': () => goalSheet(null),
};

document.addEventListener('click', e => {
  const tb = e.target.closest('.tb');
  if (tb) {
    goTo(tb.dataset.tab);
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('#sheet-root')) return;
  e.stopPropagation();
  ACTIONS[el.dataset.act]?.(el);
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    query = e.target.value;
    renderTxList();
  }
});
$('#add-btn').addEventListener('click', () => txSheet(null));
$('#settings-btn').addEventListener('click', settingsSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

render();

/* offline + installable (only on a real https site such as GitHub Pages) */
const isPreviewHost = location.hostname.endsWith('claude.ai') || location.hostname.endsWith('claudeusercontent.com');
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isPreviewHost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  });
}
})();
