(() => {
'use strict';

/* ---------- constants ---------- */
const EXP = [
  ['food', 'Food & Dining', '🍔', '#ff9f0a', 'Food'], ['groceries', 'Groceries', '🛒', '#30d158'],
  ['transport', 'Transport', '🚕', '#ffd60a'], ['shopping', 'Shopping', '🛍️', '#bf5af2'],
  ['bills', 'Bills', '💡', '#64d2ff'], ['rent', 'Rent', '🏠', '#ff375f'],
  ['entertainment', 'Fun', '🎬', '#ff6482'], ['health', 'Health', '💊', '#63e6e2'],
  ['fitness', 'Fitness', '🏋️', '#40c8e0'], ['subscriptions', 'Subscriptions', '📺', '#5e5ce6', 'Subs'],
  ['education', 'Education', '📚', '#0a84ff'], ['travel', 'Travel', '✈️', '#ac8e68'],
  ['gifts', 'Gifts', '🎁', '#da8fff'], ['other', 'Other', '📦', '#8e8e93'],
].map(([id, name, emoji, color, short]) => ({ id, name, emoji, color, short: short || name, type: 'expense' }));
const INC = [
  ['salary', 'Salary', '💼', '#30d158'], ['freelance', 'Freelance', '💻', '#0a84ff'],
  ['business', 'Business', '📈', '#ffd60a'], ['investments', 'Investments', '💹', '#bf5af2'],
  ['gift_in', 'Gifts', '🎁', '#da8fff'], ['refund', 'Refunds', '↩️', '#63e6e2'],
  ['other_in', 'Other', '💰', '#8e8e93'],
].map(([id, name, emoji, color]) => ({ id, name, emoji, color, short: name, type: 'income' }));
const CAT = Object.fromEntries([...EXP, ...INC].map(c => [c.id, c]));
const ACCOUNTS = [['upi', 'UPI', '📱'], ['card', 'Card', '💳'], ['cash', 'Cash', '💵'], ['bank', 'Bank', '🏦']];
const ACC = Object.fromEntries(ACCOUNTS.map(([id, name, emoji]) => [id, { id, name, emoji }]));
const GOAL_EMOJI = ['🛟', '💻', '🏖️', '🚗', '🏠', '💍', '🎓', '📱', '🎸', '✈️'];
const CURRENCIES = ['₹', '$', '€', '£', 'AED '];
const FIXED_PACE = ['rent', 'subscriptions', 'fitness']; // fixed costs: no "on pace" warning
const FIXED_INSIGHT = ['rent', 'bills', 'subscriptions'];
const FILTERS = [['all', 'All'], ['expense', 'Expenses'], ['income', 'Income'], ['recurring', 'Recurring']];
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const QUICK_NOTES = ['🏠 Stayed home', '🍱 Packed lunch', '💼 WFH', '🍳 Cooked at home', '🎉 Went out', '✈️ Travel day', '🤒 Sick day', '🎂 Special day'];
const TITLES = { home: 'Budgetly', activity: 'Activity', budgets: 'Budgets', insights: 'Insights' };
const KEY = 'budgetly.v1';
const SWIPE_W = 88;

const svg = d => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const IC = {
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: svg('<path d="M5 12.5 10 17.5 19 7"/>'),
  chev: '<svg class="i chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
};

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
const longDate = s => parse(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
const shortDate = s => parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const weekdayIdx = s => (parse(s).getDay() + 6) % 7; // Monday = 0

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
const total = arr => arr.reduce((a, b) => a + b, 0);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const levelColor = (used, ok = 'var(--tint)') => {
  if (used > 100) return 'var(--red)';
  if (used > 85) return 'var(--orange)';
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

/* ---------- day-to-day spend + day log ---------- */
// "Discretionary" = what you chose to spend that day. Rent and repeating bills are left out.
const isDiscretionary = t => t.type === 'expense' && !t.rid && t.cat !== 'rent';
const spendByDate = list => {
  const m = {};
  for (const t of list) {
    if (isDiscretionary(t)) m[t.date] = (m[t.date] || 0) + t.amount;
  }
  return m;
};
const daySpend = d => sum(S.tx.filter(t => t.date === d && isDiscretionary(t)));
const dayInfo = d => S.days[d] || { ns: false, note: '' };
function setDay(d, info) {
  const note = (info.note || '').trim();
  if (!info.ns && !note) delete S.days[d];
  else S.days[d] = { ns: Boolean(info.ns), note };
}
function nsStreak() {
  const d = new Date();
  if (!dayInfo(iso(d)).ns) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dayInfo(iso(d)).ns && n < 1000) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const monthDays = ym => Object.entries(S.days).filter(([d]) => d.startsWith(ym));

/* ---------- demo data ---------- */
const DEMO = {
  food: ['Swiggy', 'Zomato', 'Saravana Bhavan', 'Starbucks', 'Burger King', 'Chai & snacks', 'Biryani night', 'Office lunch'],
  groceries: ['BigBasket', 'Zepto', 'Blinkit', 'Reliance Fresh', 'More Supermarket'],
  transport: ['Uber', 'Ola', 'Rapido', 'Metro card', 'Petrol'],
  shopping: ['Amazon', 'Myntra', 'Decathlon', 'Flipkart', 'Croma'],
  entertainment: ['PVR movie', 'BookMyShow', 'Bowling', 'Concert tickets'],
  nsNotes: ['🍳 Cooked at home all day', '💼 WFH, packed lunch', '🏠 Lazy Sunday, no plans', '📚 Read and rested', '🏋️ Gym + home food', '🤒 Sick day, stayed in'],
  dayNotes: ["🎂 Friend's birthday dinner", '🛒 Big monthly grocery run', '🎉 Weekend out with friends', '🍕 Office team lunch'],
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

function seedDays(R) {
  const days = {};
  for (let i = -5; i <= 0; i++) {
    const ym = addMonths(CUR_YM, i);
    for (let k = 0; k < 5; k++) {
      const d = `${ym}-${pad(R.day())}`;
      if (d < TODAY) days[d] = { ns: true, note: R.pick(DEMO.nsNotes) };
    }
    const sd = `${ym}-${pad(R.day())}`;
    if (sd < TODAY && !days[sd]) days[sd] = { ns: false, note: R.pick(DEMO.dayNotes) };
  }
  return days;
}

function seed() {
  const R = makeDemoRandom();
  let tx = [];
  const add = (ym, day, type, cat, amount, note, acct = 'upi', rid = null) => {
    const d = `${ym}-${pad(Math.min(day, dim(ym)))}`;
    if (d > TODAY) return;
    tx.push({ id: uid(), type, cat, amount, note, acct, date: d, rid, rday: rid ? day : undefined });
  };
  for (let i = -5; i <= 0; i++) seedMonth(addMonths(CUR_YM, i), R, add);
  const days = seedDays(R);
  tx = tx.filter(t => !(days[t.date]?.ns && isDiscretionary(t)));
  return {
    currency: '₹',
    tx,
    days,
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
S.days = S.days || {};
S.budgets = S.budgets || { total: 0, cats: {} };
save();
let view = 'home';
let month = CUR_YM;
let filter = 'all';
let query = '';
let actMode = 'list';
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
const section = (title, right = '') => `<div class="section"><h2>${title}</h2>${right}</div>`;
const icon = (emoji, color) => `<span class="ic" style="--c:${color}">${emoji}</span>`;

function txRow(t) {
  const c = catOf(t.cat);
  const acc = ACC[t.acct];
  const accText = acc ? ' · ' + acc.name : '';
  const tag = t.rid ? '<span class="tag">↻</span>' : '';
  const isIn = t.type === 'income';
  const sign = isIn ? '+' : '−';
  return `<button class="row" type="button" data-act="edit-tx" data-id="${t.id}">
    ${icon(c.emoji, c.color)}
    <span class="mid"><b>${esc(t.note || c.name)}</b><small>${esc(c.name)}${accText}${tag}</small></span>
    <span class="end num ${isIn ? 'in' : ''}">${sign}${fmt(t.amount)}</span>
  </button>`;
}

function swipeRow(t) {
  return `<div class="swipe"><button class="swipe-del" type="button" data-act="del-tx" data-id="${t.id}">${IC.trash}Delete</button>${txRow(t)}</div>`;
}

function donut(parts, sumAll, centerTop, centerBottom, size = 150) {
  const r = 62;
  const C = 2 * Math.PI * r;
  const gap = parts.length > 1 ? 3 : 0;
  let acc = 0;
  const segs = parts.map(p => {
    const len = sumAll > 0 ? (p.amt / sumAll) * C : 0;
    const s = `<circle cx="75" cy="75" r="${r}" style="stroke:${p.cat.color}" stroke-dasharray="${Math.max(len - gap, 0.01)} ${C}" stroke-dashoffset="${-acc}" stroke-linecap="round"/>`;
    acc += len;
    return s;
  }).join('');
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${r}" style="stroke:var(--fill)"/>${segs}</svg>
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
  return `<div class="row">${icon(c.emoji, c.color)}<span class="mid"><b>${esc(u.note || c.name)}</b><small>${meta}</small></span><span class="end num ${isIn ? 'in' : ''}">${isIn ? '+' : ''}${fmt(u.amount)}</span></div>`;
}

function catButton(c, selected) {
  return `<button type="button" class="cat ${selCls(selected)}" data-v="${c.id}" style="--c:${c.color}"><span class="e">${c.emoji}</span><span class="t">${c.short}</span></button>`;
}

function emptyState(emoji, title, body) {
  return `<div class="empty"><div class="e">${emoji}</div><h3>${title}</h3><p>${body}</p></div>`;
}

function segControl(id, items, current, extraCls = '') {
  const btns = items.map(([v, label, cls = '']) => `<button type="button" class="${cls} ${selCls(v === current)}" data-v="${v}">${label}</button>`).join('');
  return `<div class="seg-ctl ${extraCls}" id="${id}">${btns}</div>`;
}

/* ---------- render ---------- */
function render() {
  document.querySelectorAll('.tb').forEach(b => b.classList.toggle('sel', b.dataset.tab === view));
  $('#title').textContent = TITLES[view];
  $('#nav-title').textContent = TITLES[view];
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
  if (view === 'activity' && actMode === 'list') {
    $('#q').value = query;
    renderTxList();
  }
  openSwipe = null;
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
      <div class="stat"><span class="ar in">${IC.down}</span><div><small>Income</small><b class="num">${fmt(c.inc)}</b></div></div>
      <div class="stat"><span class="ar out">${IC.up}</span><div><small>Expenses</small><b class="num">${fmt(c.exp)}</b></div></div>
    </div>
  </section>`;
}

function nsLoggedRow(d, label) {
  const info = dayInfo(d);
  const streak = nsStreak();
  const end = streak > 1 ? `<span class="pill-btn">🔥 ${streak} days</span>` : IC.chev;
  const sub = info.note ? esc(info.note) : 'Logged as a no-spend day';
  return `<div class="row tap" data-act="day" data-date="${d}"><span class="ic solid" style="--c:var(--green)">${IC.check}</span><span class="mid"><b>${label}: no-spend day 🎉</b><small>${sub}</small></span>${end}</div>`;
}

function spentRow(d, label, spent) {
  const info = dayInfo(d);
  const sub = info.note ? '📝 ' + esc(info.note) : 'Tap to add a note about the day';
  return `<div class="row tap" data-act="day" data-date="${d}">${icon('🧾', 'var(--orange)')}<span class="mid"><b>${label}: ${fmt(spent)} spent</b><small>${sub}</small></span>${IC.chev}</div>`;
}

function markRow(d, label) {
  return `<div class="row tap" data-act="day" data-date="${d}">${icon('🌱', 'var(--green)')}<span class="mid"><b>${label}: nothing spent?</b><small>Mark it to build your no-spend streak</small></span><button class="pill-btn filled" type="button" data-act="mark-ns" data-date="${d}">Mark</button></div>`;
}

function dayStatusRow(d, label, onlyIfUnlogged) {
  const spent = daySpend(d);
  if (dayInfo(d).ns) return onlyIfUnlogged ? '' : nsLoggedRow(d, label);
  if (spent > 0) return onlyIfUnlogged ? '' : spentRow(d, label, spent);
  return markRow(d, label);
}

function todayCard(c) {
  if (!c.isCur) return '';
  const rows = dayStatusRow(TODAY, 'Today', false) + dayStatusRow(yesterday(), 'Yesterday', true);
  return `<div class="group">${rows}</div>`;
}

function budgetCard(c) {
  if (!c.total) {
    return `<div class="group"><div class="row tap" data-act="edit-total">${icon('🎯', 'var(--tint)')}<span class="mid"><b>Set a monthly budget</b><small>See how much is safe to spend each day</small></span>${IC.chev}</div></div>`;
  }
  const used = pct(c.exp, c.total);
  const left = c.total - c.exp;
  const leftLabel = left >= 0 ? 'left to spend' : 'over budget';
  const safe = c.isCur && left > 0 ? fmt(left / c.daysLeft) : '—';
  return `<section class="group pad tap" data-act="go" data-tab="budgets" role="button">
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
  let body = '<p class="footnote in">No expenses this month yet.</p>';
  if (cats.length) {
    const top = cats.slice(0, 5);
    const rest = cats.slice(5).reduce((a, x) => a + x.amt, 0);
    if (rest > 0) top.push({ cat: { name: 'Everything else', color: '#8e8e93' }, amt: rest });
    const legend = top.map(p => legendItem(p, c.exp)).join('');
    body = `<div class="donut-wrap">${donut(top, c.exp, fmtK(c.exp), 'spent')}<ul class="legend">${legend}</ul></div>`;
  }
  return section('Where it went', '<button class="link" type="button" data-act="go" data-tab="insights">Insights</button>') + `<div class="group pad">${body}</div>`;
}

function upcomingCard(c) {
  if (!c.isCur) return '';
  const up = upcoming().filter(u => u.type === 'expense').slice(0, 4);
  if (!up.length) return '';
  const rows = up.map(u => dueRow(u, false)).join('');
  return section('Upcoming bills', `<span class="link num" style="color:var(--label2)">${fmt(sum(up))}</span>`) + `<div class="group">${rows}</div>`;
}

function recentCard(c) {
  const recent = [...c.list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const body = recent.length
    ? `<div class="group">${recent.map(swipeRow).join('')}</div><p class="footnote">Swipe left on a transaction to delete it.</p>`
    : `<div class="group pad"><p class="footnote in">Nothing recorded in ${monthName(month, { month: 'long' })}.</p></div>`;
  return section('Recent', '<button class="link" type="button" data-act="go" data-tab="activity">See all</button>') + body;
}

function homeView() {
  if (!S.tx.length && !Object.keys(S.days).length) {
    return emptyState('💸', 'No money moves yet', 'Tap + to add your first expense or income.<br>Or load sample data from Settings.');
  }
  const c = homeContext();
  return heroCard(c) + todayCard(c) + budgetCard(c) + whereCard(c) + upcomingCard(c) + recentCard(c);
}

/* ---------- activity ---------- */
function filterChip([k, label]) {
  return `<button class="chip-tab ${selCls(filter === k)}" type="button" data-act="filter" data-f="${k}">${label}</button>`;
}

function activityView() {
  const list = monthTx(month);
  const mode = segControl('act-mode', [['list', 'List'], ['cal', 'Calendar']], actMode, 'big');
  const tiles = `<div class="summary">
    <div class="tile"><div class="n num" style="color:var(--green)">${fmtK(sum(list, 'income'))}</div><div class="l">Income</div></div>
    <div class="tile"><div class="n num" style="color:var(--red)">${fmtK(sum(list, 'expense'))}</div><div class="l">Expenses</div></div>
    <div class="tile"><div class="n num">${monthDays(month).filter(([, v]) => v.ns).length}</div><div class="l">No-spend days</div></div>
  </div>`;
  if (actMode === 'cal') return mode + tiles + calendarView();
  return `${mode}${tiles}
  <label class="search">${IC.search}<input id="q" type="search" placeholder="Search" autocomplete="off" aria-label="Search transactions"></label>
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
  const info = dayInfo(d);
  const net = sum(ts, 'income') - sum(ts, 'expense');
  const nsMark = info.ns ? '<span class="note-mark ns-badge">✓ No-spend</span>' : '';
  const netText = ts.length ? fmt(net, true) : '';
  const nsRow = info.ns && !ts.length
    ? `<div class="row tap" data-act="day" data-date="${d}"><span class="ic solid" style="--c:var(--green)">${IC.check}</span><span class="mid"><b>No-spend day</b><small>Nothing spent 🎉</small></span></div>`
    : '';
  const noteRow = info.note
    ? `<div class="row tap note-row" data-act="day" data-date="${d}">${icon('📝', 'var(--blue)')}<span class="mid"><small class="wrap">${esc(info.note)}</small></span></div>`
    : '';
  return `<button class="day-head" type="button" data-act="day" data-date="${d}"><span>${dayLabel(d)}${nsMark}</span><span class="num">${netText}</span></button>
    <div class="group">${nsRow}${noteRow}${ts.map(swipeRow).join('')}</div>`;
}

function renderTxList() {
  const el = $('#tx-list');
  if (!el) return;
  const q = query.trim().toLowerCase();
  const list = monthTx(month).filter(t => matchesFilter(t) && matchesQuery(t, q));
  const groups = groupBy(list, 'date');
  if (filter === 'all' && !q) {
    for (const [d] of monthDays(month)) {
      if (!groups[d]) groups[d] = [];
    }
  }
  const entries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  if (!entries.length) {
    const msg = q ? 'No matches for that search.' : 'No transactions for this filter.';
    el.innerHTML = emptyState('🔍', 'Nothing here', msg);
    return;
  }
  el.innerHTML = entries.map(dayGroup).join('') + '<p class="footnote">Tap a date to add a note or mark a no-spend day. Swipe left on a transaction to delete it.</p>';
}

function calLabel(info, v) {
  if (info.ns) return '✓';
  return v ? fmtK(v) : '';
}

function calCell(d, v, max) {
  const info = dayInfo(d);
  const cls = ['cal-day'];
  if (d > TODAY) cls.push('future');
  if (d === TODAY) cls.push('today');
  if (info.ns) cls.push('ns');
  const heat = v ? Math.round(14 + 50 * (v / max)) : 0;
  const dot = info.note ? '<i class="dot"></i>' : '';
  return `<button type="button" class="${cls.join(' ')}" style="--heat:${heat}%" data-act="day" data-date="${d}" aria-label="${longDate(d)}">${dot}<b>${Number(d.slice(8))}</b><small>${calLabel(info, v)}</small></button>`;
}

function calendarView() {
  const [y, m] = month.split('-').map(Number);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const spend = spendByDate(monthTx(month));
  const max = Math.max(1, ...Object.values(spend));
  const blanks = '<span class="cal-day blank"></span>'.repeat(offset);
  const cells = Array.from({ length: dim(month) }, (_, i) => {
    const d = `${month}-${pad(i + 1)}`;
    return calCell(d, spend[d] || 0, max);
  }).join('');
  const head = WD.map(w => `<span>${w}</span>`).join('');
  return `<div class="group cal">
    <div class="cal-head">${head}</div>
    <div class="cal-grid">${blanks}${cells}</div>
    <div class="cal-legend"><span><i style="background:color-mix(in srgb, var(--red) 55%, var(--fill))"></i>More spent</span><span><i style="background:color-mix(in srgb, var(--green) 40%, var(--bg2))"></i>No-spend</span><span><i style="background:var(--blue);border-radius:50%"></i>Has a note</span></div>
  </div>
  <p class="footnote">Day-to-day spending only (rent and repeating bills left out). Tap a day to see it, add a note, or mark it as a no-spend day.</p>`;
}

/* ---------- budgets ---------- */
function budgetStatus(catId, lim, spent, pace) {
  if (spent > lim) return { text: `${fmt(spent - lim)} over budget`, color: 'var(--red)' };
  const base = `${fmt(Math.max(lim - spent, 0))} left`;
  if (pace !== null && !FIXED_PACE.includes(catId) && pace > lim * 1.05) {
    return { text: `${base} · on pace for ${fmt(pace)}`, color: 'var(--orange)' };
  }
  return { text: base, color: '' };
}

function catBudgetRow(c, spentMap, elapsed) {
  const lim = S.budgets.cats[c.id];
  const s = spentMap[c.id] || 0;
  const p = pct(s, lim);
  const pace = elapsed < 1 ? s / Math.max(elapsed, 0.01) : null;
  const st = budgetStatus(c.id, lim, s, pace);
  const stStyle = st.color ? `style="color:${st.color}"` : '';
  return `<button class="row" type="button" data-act="edit-cat-budget" data-cat="${c.id}">
    ${icon(c.emoji, c.color)}
    <span class="mid"><b>${c.name}</b><div class="progress thin" style="margin:6px 0 4px"><i style="width:${Math.min(p, 100)}%;--c:${levelColor(p, c.color)}"></i></div><small ${stStyle}>${st.text}</small></span>
    <span class="end num">${fmt(s)}<small style="display:block;text-align:right;color:var(--label2);font-weight:400;font-size:13px">of ${fmtK(lim)}</small></span></button>`;
}

function unbudgetedRow(c, spentMap) {
  return `<button class="row" type="button" data-act="edit-cat-budget" data-cat="${c.id}">${icon(c.emoji, c.color)}<span class="mid"><b>${c.name}</b><small>${fmt(spentMap[c.id])} spent · no limit</small></span><span class="link">Set</span></button>`;
}

function totalBudgetCard(exp) {
  const limit = S.budgets.total || 0;
  let body = '<p class="footnote in">No overall budget yet. Tap to set one.</p>';
  if (limit) {
    const used = pct(exp, limit);
    const ring = donut([{ cat: { color: levelColor(used) }, amt: Math.min(exp, limit) }], limit, used + '%', 'used', 120);
    const leftText = exp <= limit ? fmt(limit - exp) + ' left' : fmt(exp - limit) + ' over';
    const catSum = Object.values(S.budgets.cats).reduce((a, b) => a + b, 0);
    const split = catSum ? '<br>' + fmt(catSum) + ' split across categories' : '';
    body = `<div class="donut-wrap">${ring}<div><div class="budget-top" style="display:block"><b class="num">${fmt(exp)}</b> <span>of ${fmt(limit)}</span></div><p class="footnote in">${leftText}${split}</p></div></div>`;
  }
  return `<section class="group pad tap" data-act="edit-total" role="button"><div class="card-head"><h3>Monthly budget</h3><span class="link">Edit</span></div>${body}</section>`;
}

function goalCard(g) {
  const p = Math.min(pct(g.saved, g.target), 100);
  const C = 2 * Math.PI * 24;
  return `<button class="goal" type="button" data-act="edit-goal" data-id="${g.id}">
    <div class="ring"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" style="stroke:var(--fill)"/><circle cx="28" cy="28" r="24" style="stroke:var(--tint)" stroke-linecap="round" stroke-dasharray="${(p / 100) * C} ${C}"/></svg><span>${g.emoji}</span></div>
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
  const catRows = withBudget.map(c => catBudgetRow(c, spentMap, elapsed)).join('') + unbudgeted.map(c => unbudgetedRow(c, spentMap)).join('');
  const catGroup = catRows ? `<div class="group">${catRows}</div>` : '<div class="group pad"><p class="footnote in">No category budgets yet.</p></div>';
  const subs = upcoming();
  const subRows = subs.length
    ? `<div class="group">${subs.map(s => dueRow(s, true)).join('')}</div>`
    : '<div class="group pad"><p class="footnote in">Turn on "Repeat monthly" when adding rent, salary or subscriptions — they\'ll add themselves each month.</p></div>';

  return `${totalBudgetCard(exp)}
  ${section('Categories', '<button class="link" type="button" data-act="add-cat-budget">Add</button>')}
  ${catGroup}
  ${section('Savings goals')}
  <div class="goals">${S.goals.map(goalCard).join('')}<button class="goal add" type="button" data-act="new-goal">+ New goal</button></div>
  ${section('Recurring', `<span class="link num" style="color:var(--label2)">${fmt(sum(subs, 'expense'))}/mo</span>`)}
  ${subRows}`;
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
    const op = isSel ? 1 : 0.45;
    const lblStyle = isSel ? 'style="fill:var(--label);font-weight:700"' : '';
    return `<rect x="${x - bw - 2}" y="${H - hi}" width="${bw}" height="${Math.max(hi, 1.5)}" rx="5" style="fill:var(--green)" opacity="${op}"/>
      <rect x="${x + 2}" y="${H - he}" width="${bw}" height="${Math.max(he, 1.5)}" rx="5" style="fill:var(--red)" opacity="${op}"/>
      <text x="${x}" y="${H + 16}" text-anchor="middle" ${lblStyle}>${monthName(d.m, { month: 'short' })}</text>`;
  }).join('');
  const grid = [0.5, 1].map(f => `<line x1="0" x2="${CHART_W}" y1="${H - f * H}" y2="${H - f * H}" style="stroke:var(--sep)" stroke-dasharray="3 4"/><text x="${CHART_W}" y="${H - f * H - 4}" text-anchor="end">${fmtK(max * f)}</text>`).join('');
  return `<section class="group pad chart">
    <div class="card-head"><h3>Cash flow</h3><span>Last 6 months</span></div>
    <svg viewBox="0 -8 ${CHART_W} ${H + 26}">${grid}${bars}</svg>
    <div class="legend-inline"><span><i style="background:var(--green)"></i>Income</span><span><i style="background:var(--red)"></i>Expenses</span></div>
  </section>`;
}

function dailySpend(list) {
  const daily = new Array(dim(month)).fill(0);
  const map = spendByDate(list);
  for (const [d, v] of Object.entries(map)) daily[Number(d.slice(8)) - 1] = v;
  return daily;
}

function weekdayAverages(daily, dayN) {
  const tot = new Array(7).fill(0);
  const cnt = new Array(7).fill(0);
  for (let d = 1; d <= dayN; d++) {
    const wd = weekdayIdx(`${month}-${pad(d)}`);
    tot[wd] += daily[d - 1];
    cnt[wd]++;
  }
  return tot.map((t, i) => (cnt[i] ? t / cnt[i] : 0));
}

function weekdayBar(v, i, ctx) {
  const h = (v / ctx.max) * ctx.H;
  const x = i * ctx.slot + (ctx.slot - ctx.bw) / 2;
  const cx = x + ctx.bw / 2;
  const color = i === ctx.top && v > 0 ? 'var(--red)' : 'var(--tint)';
  const valueLabel = v ? fmtK(v) : '';
  return `<rect x="${x}" y="${16 + ctx.H - h}" width="${ctx.bw}" height="${v ? Math.max(h, 3) : 0}" rx="7" style="fill:${color}"/>
    <text x="${cx}" y="${11 + ctx.H - h}" text-anchor="middle">${valueLabel}</text>
    <text x="${cx}" y="${ctx.H + 32}" text-anchor="middle" style="font-size:12px;font-weight:600">${WD[i]}</text>`;
}

function weekdayCard(daily, dayN) {
  const avgs = weekdayAverages(daily, dayN);
  const hi = Math.max(...avgs);
  const ctx = { H: 100, slot: CHART_W / 7, bw: 26, max: Math.max(1, hi), top: avgs.indexOf(hi) };
  const typical = total(daily.slice(0, dayN)) / Math.max(dayN, 1);
  const spentDays = avgs.filter(v => v > 0);
  let caption = 'No day-to-day spending logged yet this month.';
  if (typical > 0) {
    const low = avgs.indexOf(Math.min(...avgs));
    const ratio = (hi / typical).toFixed(1);
    const cheap = spentDays.length < 7 ? 'Some weekdays have no spending at all — nice.' : `<b>${WD_LONG[low]}s</b> are your cheapest.`;
    caption = `<b>${WD_LONG[ctx.top]}s</b> cost you the most — about ${fmt(hi)} a day, ${ratio}× a typical day. ${cheap}`;
  }
  const bars = avgs.map((v, i) => weekdayBar(v, i, ctx)).join('');
  return `<section class="group pad chart">
    <div class="card-head"><h3>By day of week</h3><span>Average spend per day</span></div>
    <svg viewBox="0 0 ${CHART_W} ${ctx.H + 38}">${bars}</svg>
    <p class="insight-txt">${caption}</p>
  </section>`;
}

function weekRow(range, idx, ctx) {
  const [a, b] = range;
  const future = `${month}-${pad(a)}` > TODAY;
  const spent = total(ctx.daily.slice(a - 1, b));
  const ns = monthDays(month).filter(([d, v]) => v.ns && Number(d.slice(8)) >= a && Number(d.slice(8)) <= b).length;
  const nsText = ns ? ` · ${ns} no-spend` : '';
  const val = future ? '—' : fmt(spent);
  const isTop = idx === ctx.top && spent > 0;
  return `<div class="row"><span class="ic" style="--c:${isTop ? 'var(--red)' : 'var(--blue)'};font-size:14px;font-weight:700">W${idx + 1}</span>
    <span class="mid"><b>Week ${idx + 1}</b><small>${a}–${b} ${ctx.mon}${nsText}</small><div class="progress thin" style="margin-top:6px"><i style="width:${pct(spent, ctx.max)}%;--c:${isTop ? 'var(--red)' : 'var(--tint)'}"></i></div></span>
    <span class="end num">${val}</span></div>`;
}

function weeksCard(daily) {
  const days = daily.length;
  const ranges = [[1, 7], [8, 14], [15, 21], [22, 28], [29, days]].filter(([a]) => a <= days);
  const sums = ranges.map(([a, b]) => total(daily.slice(a - 1, b)));
  const ctx = { daily, max: Math.max(1, ...sums), top: sums.indexOf(Math.max(...sums)), mon: monthName(month, { month: 'short' }) };
  return section('Week by week') + `<div class="group">${ranges.map((r, i) => weekRow(r, i, ctx)).join('')}</div>`;
}

function dayFill(i, v, dayN, avg) {
  if (i + 1 > dayN) return 'var(--fill)';
  if (v > avg * 1.6) return 'var(--red)';
  return 'var(--tint)';
}

function dailyChart(daily, dayN, avg) {
  const days = daily.length;
  const dmax = Math.max(1, ...daily);
  const dw = CHART_W / days;
  const bars = daily.map((v, i) => {
    const h = (v / dmax) * 90;
    const height = v ? Math.max(h, 2) : 0;
    return `<rect x="${i * dw + 1}" y="${90 - h}" width="${Math.max(dw - 2, 1)}" height="${height}" rx="2" style="fill:${dayFill(i, v, dayN, avg)}"/>`;
  }).join('');
  const avgY = 90 - (avg / dmax) * 90;
  return `<section class="group pad chart">
    <div class="card-head"><h3>Daily spending</h3><span class="num">avg ${fmt(avg)}/day</span></div>
    <svg viewBox="0 0 ${CHART_W} 108">${bars}<line x1="0" x2="${CHART_W}" y1="${avgY}" y2="${avgY}" style="stroke:var(--label2)" stroke-dasharray="4 4"/>
      <text x="0" y="104">1</text><text x="${CHART_W / 2}" y="104" text-anchor="middle">${Math.round(days / 2)}</text><text x="${CHART_W}" y="104" text-anchor="end">${days}</text></svg>
    <p class="footnote in">Red bars are spikes above 1.6× your average. Rent and repeating bills are left out.</p>
  </section>`;
}

function notesCard() {
  const notes = monthDays(month).filter(([, v]) => v.note).sort((a, b) => b[0].localeCompare(a[0]));
  if (!notes.length) {
    return section('Day notes') + '<div class="group pad"><p class="footnote in">Add a note to any day from Activity → Calendar to remember why it was expensive (or cheap).</p></div>';
  }
  const rows = notes.map(([d, v]) => {
    const spent = daySpend(d);
    const end = v.ns ? '<span class="end ns-badge">No-spend</span>' : `<span class="end num muted">${fmt(spent)}</span>`;
    return `<div class="row tap" data-act="day" data-date="${d}">${icon('📝', 'var(--blue)')}<span class="mid"><b>${dayLabel(d)}</b><small class="wrap">${esc(v.note)}</small></span>${end}</div>`;
  }).join('');
  return section('Day notes') + `<div class="group">${rows}</div>`;
}

function categoryRow(c, exp, topAmt) {
  return `<div class="row">${icon(c.cat.emoji, c.cat.color)}<span class="mid"><b>${c.cat.name}</b><div class="progress thin" style="margin-top:6px"><i style="width:${pct(c.amt, topAmt)}%;--c:${c.cat.color}"></i></div></span><span class="end num">${fmt(c.amt)}<small style="display:block;text-align:right;color:var(--label2);font-weight:400;font-size:13px">${pct(c.amt, exp)}%</small></span></div>`;
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
  const biggest = list.filter(isDiscretionary).sort((a, b) => b.amount - a.amount)[0];
  if (!biggest) return null;
  return ['💥', 'Biggest one-off', `${esc(biggest.note || catOf(biggest.cat).name)} — ${fmt(biggest.amount)} on ${shortDate(biggest.date)}.`];
}

function noSpendInsight() {
  const logged = monthDays(month).filter(([, v]) => v.ns).length;
  const streak = nsStreak();
  if (!logged) return ['🌱', 'No no-spend days yet', 'Spent nothing on a day? Tap Mark on Home, or a day in Activity → Calendar.'];
  const streakText = streak > 1 ? ` You're on a ${streak}-day streak 🔥` : '';
  return ['🧘', `${plural(logged, 'no-spend day')}`, `Logged this month.${streakText}`];
}

function subscriptionInsight() {
  const subs = upcoming().filter(s => s.type === 'expense' && s.cat === 'subscriptions');
  if (!subs.length) return null;
  return ['📺', `${fmt(sum(subs) * 12)} a year on subscriptions`, `${subs.map(s => esc(s.note)).join(', ')}. Still using them all?`];
}

function insightRow([e, t, p]) {
  return `<div class="row">${icon(e, 'var(--blue)')}<span class="mid"><b>${t}</b><small class="wrap">${p}</small></span></div>`;
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
  const avg = total(daily.slice(0, dayN)) / Math.max(dayN, 1);
  const cats = byCat(list);
  const catRows = cats.length ? `<div class="group">${cats.map(c => categoryRow(c, exp, cats[0].amt)).join('')}</div>` : '<div class="group pad"><p class="footnote in">No expenses yet.</p></div>';
  const insights = [
    noSpendInsight(),
    trendInsight(exp, prevToDate, isCur),
    savingsInsight(inc, exp),
    leaderInsight(cats, list, prev, exp),
    biggestInsight(list),
    subscriptionInsight(),
  ].filter(Boolean);

  return `${cashFlowChart()}
  ${section('Spending patterns')}
  ${weekdayCard(daily, dayN)}
  ${dailyChart(daily, dayN, avg)}
  ${weeksCard(daily)}
  ${notesCard()}
  ${section('Smart insights')}
  <div class="group">${insights.map(insightRow).join('')}</div>
  ${section('By category')}
  ${catRows}`;
}

/* ---------- sheets ---------- */
function enableSheetDrag(sheet) {
  const head = sheet.querySelector('.sheet-head');
  let y0 = null;
  let dy = 0;
  head.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return;
    y0 = e.touches[0].clientY;
    dy = 0;
    sheet.classList.add('dragging');
  }, { passive: true });
  head.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  head.addEventListener('touchend', () => {
    if (y0 === null) return;
    y0 = null;
    sheet.classList.remove('dragging');
    if (dy > 110) closeSheet();
    else sheet.style.transform = '';
  });
}

function openSheet({ title, body, onOk }) {
  const root = $('#sheet-root');
  const okBtn = onOk ? `<button type="button" class="circle-btn ok" id="sheet-ok" aria-label="Save">${IC.check}</button>` : '<span></span>';
  root.innerHTML = `<div class="backdrop" id="bd"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><div class="grabber"></div><button type="button" class="circle-btn" data-close aria-label="Close">${IC.x}</button><h2>${esc(title)}</h2>${okBtn}</div>
    ${body}</div></div>`;
  document.body.classList.add('lock');
  $('#bd').addEventListener('click', e => {
    if (e.target.id === 'bd' || e.target.closest('[data-close]')) closeSheet();
  });
  if (onOk) $('#sheet-ok').addEventListener('click', onOk);
  const sheet = root.querySelector('.sheet');
  enableSheetDrag(sheet);
  return sheet;
}
function closeSheet() {
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('lock');
}
function finish(msg, action) {
  save();
  closeSheet();
  render();
  if (msg) toast(msg, action);
}

function alertBox(title, msg, okLabel, fn) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop alert-wrap" id="bd"><div class="alert glass" role="alertdialog" aria-modal="true">
    <h2>${esc(title)}</h2><p>${esc(msg)}</p>
    <button type="button" class="btn-wide danger" id="al-ok">${esc(okLabel)}</button><button type="button" class="btn-wide gray" data-close>Cancel</button></div></div>`;
  document.body.classList.add('lock');
  $('#bd').addEventListener('click', e => {
    if (e.target.id === 'bd' || e.target.closest('[data-close]')) closeSheet();
  });
  $('#al-ok').addEventListener('click', () => {
    closeSheet();
    fn();
  });
}

/* transaction sheet */
function txSheetBody(st, editing) {
  const del = editing ? '<div class="group"><button type="button" class="row danger-row" id="a-del">Delete Transaction</button></div>' : '';
  const typeSeg = segControl('a-type', [['expense', 'Expense', 'exp'], ['income', 'Income', 'inc']], st.type, 'type big');
  const acctSeg = segControl('a-acct', ACCOUNTS.map(([id, n, e]) => [id, `<span class="e">${e}</span>${n}`]), st.acct, 'acct big');
  return `${typeSeg}
    <div class="amount-box"><span class="cur">${S.currency}</span><input id="a-amt" inputmode="decimal" enterkeyhint="done" placeholder="0" value="${st.amount || ''}" aria-label="Amount"></div>
    <p class="label">Category</p>
    <div class="group"><div class="cat-grid" id="a-cats"></div></div>
    <p class="label">Paid with</p>
    ${acctSeg}
    <div class="group">
      <div class="field-row"><span>Date</span><input type="date" id="a-date" value="${st.date}" max="${TODAY}" aria-label="Date"></div>
      <div class="field-row"><div class="date-chips" id="a-dates"><button type="button" data-off="0">Today</button><button type="button" data-off="-1">Yesterday</button></div></div>
      <div class="field-row"><span>Note</span><input id="a-note" maxlength="40" placeholder="Swiggy, rent, salary…" value="${esc(st.note)}" enterkeyhint="done"></div>
      <div class="field-row"><span>Repeat monthly</span><span style="flex:1"></span><input type="checkbox" class="switch" id="a-rec" ${st.rid ? 'checked' : ''} aria-label="Repeat monthly"></div>
    </div>
    <button type="button" class="btn-wide filled" id="a-save">${editing ? 'Save Changes' : 'Add'}</button>
    <div style="height:14px"></div>
    ${del}`;
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
  let extra = '';
  if (isDiscretionary({ ...fields, rid: repeat ? 'r' : null }) && dayInfo(date).ns) {
    setDay(date, { ...dayInfo(date), ns: false });
    extra = ' · no-spend mark removed';
  }
  const repeats = runRecurring();
  if (repeats) extra += ` · +${repeats} repeats`;
  if (ymOf(date) <= CUR_YM) month = ymOf(date);
  const kind = st.type === 'income' ? 'Income' : 'Expense';
  finish((original ? 'Saved' : kind + ' added') + extra);
}

function deleteTx(id) {
  const i = S.tx.findIndex(x => x.id === id);
  if (i < 0) return;
  const t = S.tx[i];
  S.tx.splice(i, 1);
  const skipKey = t.rid ? `${t.rid}|${t.date}` : null;
  if (skipKey) S.skip.push(skipKey);
  finish('Transaction deleted', {
    label: 'Undo',
    fn: () => {
      S.tx.push(t);
      if (skipKey) S.skip = S.skip.filter(k => k !== skipKey);
      save();
      render();
    },
  });
}

function txSheet(t, presetDate) {
  const editing = Boolean(t);
  const fresh = { type: 'expense', cat: 'food', acct: 'upi', date: presetDate || (month === CUR_YM ? TODAY : `${month}-01`), amount: '', note: '', rid: null };
  const st = t ? { ...t } : fresh;
  const sheet = openSheet({ title: editing ? 'Edit Transaction' : 'New Transaction', body: txSheetBody(st, editing), onOk: () => saveTx(t, st) });
  const paint = () => {
    sheet.querySelectorAll('#a-type button').forEach(b => b.classList.toggle('sel', b.dataset.v === st.type));
    sheet.querySelectorAll('#a-acct button').forEach(b => b.classList.toggle('sel', b.dataset.v === st.acct));
    const cats = st.type === 'expense' ? EXP : INC;
    if (!cats.some(c => c.id === st.cat)) st.cat = cats[0].id;
    $('#a-cats').innerHTML = cats.map(c => catButton(c, c.id === st.cat)).join('');
  };
  const paintDates = () => {
    const v = $('#a-date').value;
    const y = yesterday();
    sheet.querySelectorAll('#a-dates button').forEach(b => b.classList.toggle('sel', v === (b.dataset.off === '0' ? TODAY : y)));
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
  if (!editing) setTimeout(() => amt.focus(), 300);
  $('#a-save').addEventListener('click', () => saveTx(t, st));
  if (editing) $('#a-del').addEventListener('click', () => deleteTx(t.id));
}

/* day sheet: note + no-spend */
function daySheetBody(d, spent, ts) {
  const info = dayInfo(d);
  const txGroup = ts.length ? `<p class="label">Spent ${fmt(spent)}</p><div class="group">${ts.map(txRow).join('')}</div>` : '';
  const locked = spent > 0;
  const nsHint = locked ? '<p class="footnote" style="margin:-10px 16px 16px">You have day-to-day spending on this day, so it can\'t be a no-spend day.</p>' : '';
  const chips = QUICK_NOTES.map(q => `<button type="button" data-q="${esc(q)}">${q}</button>`).join('');
  return `${txGroup}
    <div class="group"><div class="field-row"><span>🌱 No-spend day</span><span style="flex:1"></span><input type="checkbox" class="switch" id="d-ns" ${info.ns && !locked ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="No-spend day"></div></div>
    ${nsHint}
    <p class="label">Note</p>
    <div class="group"><textarea class="note" id="d-note" maxlength="200" placeholder="How did the day go? Why did you spend (or not)?">${esc(info.note)}</textarea></div>
    <div class="quick-notes" id="d-quick">${chips}</div>
    <button type="button" class="btn-wide filled" id="d-save">Save</button>
    <button type="button" class="btn-wide gray" id="d-add">Add an Expense on This Day</button>`;
}

function daySheet(d) {
  const ts = S.tx.filter(t => t.date === d);
  const spent = daySpend(d);
  const saveDay = () => {
    const ns = $('#d-ns').checked && spent === 0;
    setDay(d, { ns, note: $('#d-note').value });
    finish(ns ? 'No-spend day saved 🎉' : 'Day saved');
  };
  const sheet = openSheet({ title: longDate(d), body: daySheetBody(d, spent, ts), onOk: saveDay });
  $('#d-save').addEventListener('click', saveDay);
  $('#d-add').addEventListener('click', () => txSheet(null, d));
  $('#d-quick').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const area = $('#d-note');
    area.value = area.value.trim() ? `${area.value.trim()}, ${b.dataset.q}` : b.dataset.q;
  });
  sheet.addEventListener('click', e => {
    const row = e.target.closest('[data-act="edit-tx"]');
    if (row) txSheet(S.tx.find(t => t.id === row.dataset.id));
  });
}

function markNoSpend(d) {
  setDay(d, { ...dayInfo(d), ns: true });
  save();
  render();
  toast(`${dayLabel(d)} marked as no-spend 🎉`, { label: 'Add note', fn: () => daySheet(d) });
}

/* number sheet (budgets) */
function numberSheet({ title, value, hint, onSave, onRemove }) {
  const hintHtml = hint ? `<p class="footnote" style="text-align:center">${hint}</p>` : '';
  const removeBtn = onRemove ? '<div class="group" style="margin-top:18px"><button type="button" class="row danger-row" id="n-rm">Remove Limit</button></div>' : '';
  const go = () => {
    const v = toNumber($('#n-val').value);
    if (Number.isNaN(v) || v < 0) {
      $('#n-val').focus();
      return;
    }
    onSave(v);
    finish();
  };
  openSheet({
    title,
    body: `<div class="amount-box"><span class="cur">${S.currency}</span><input id="n-val" inputmode="decimal" enterkeyhint="done" value="${value || ''}" placeholder="0" aria-label="Amount"></div>${hintHtml}${removeBtn}`,
    onOk: go,
  });
  const inp = $('#n-val');
  const fit = () => { inp.style.width = Math.max(1, inp.value.length) * 0.68 + 0.3 + 'em'; };
  inp.addEventListener('input', fit);
  fit();
  setTimeout(() => { inp.focus(); inp.select(); }, 250);
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
  openSheet({ title: 'Budget a Category', body: `<div class="group"><div class="cat-grid" id="pick-cats">${free.map(c => catButton(c, false)).join('')}</div></div>` });
  $('#pick-cats').addEventListener('click', e => {
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
    value: S.budgets.cats[id],
    hint: avg3 ? `Monthly limit · you've averaged ${fmt(avg3)}/month here over the last 3 months.` : 'Monthly limit for this category.',
    onSave: v => {
      if (v > 0) S.budgets.cats[id] = v;
      else delete S.budgets.cats[id];
    },
    onRemove: hasLimit ? () => { delete S.budgets.cats[id]; } : null,
  });
}

/* goals */
function goalProgressHtml(g) {
  const p = pct(g.saved, g.target);
  const status = g.saved >= g.target ? '🎉 Goal reached!' : fmt(g.target - g.saved) + ' to go';
  return `<div class="group pad"><div class="budget-top"><div><b class="num">${fmt(g.saved)}</b> <span>saved</span></div><span class="num">${p}%</span></div>
      <div class="progress"><i style="width:${Math.min(p, 100)}%"></i></div><p class="footnote in">${status}</p></div>
    <div class="group"><div class="field-row"><span>Add money</span><input id="g-add" inputmode="decimal" enterkeyhint="done" placeholder="${S.currency}0"><button type="button" class="pill-btn filled" id="g-add-btn">Add</button></div></div>`;
}

function emojiChip(e, selected) {
  return `<button type="button" class="${selCls(selected)}" data-v="${e}">${e}</button>`;
}

function goalSheet(g) {
  const editing = Boolean(g);
  const st = g ? { ...g } : { emoji: '🛟', name: '', target: '', saved: 0 };
  const progress = editing ? goalProgressHtml(g) : '';
  const del = editing ? '<div class="group"><button type="button" class="row danger-row" id="g-del">Delete Goal</button></div>' : '';
  const saveGoal = () => {
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
  };
  const sheet = openSheet({
    title: editing ? g.name : 'New Goal',
    onOk: saveGoal,
    body: `${progress}
    <p class="label">Details</p>
    <div class="group">
      <div class="field-row"><span>Name</span><input id="g-name" maxlength="30" placeholder="Emergency fund" value="${esc(st.name)}"></div>
      <div class="field-row"><span>Target</span><input id="g-target" inputmode="decimal" value="${st.target || ''}" placeholder="${S.currency}0"></div>
      <div class="field-row"><span>Saved so far</span><input id="g-saved" inputmode="decimal" value="${st.saved || ''}" placeholder="${S.currency}0"></div>
    </div>
    <p class="label">Icon</p>
    <div class="group"><div class="emoji-chips" id="g-emoji">${GOAL_EMOJI.map(e => emojiChip(e, e === st.emoji)).join('')}</div></div>
    ${del}`,
  });
  sheet.querySelector('#g-emoji').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    st.emoji = b.dataset.v;
    sheet.querySelectorAll('#g-emoji button').forEach(x => x.classList.toggle('sel', x === b));
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
  const header = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note', 'Recurring', 'Day note', 'No-spend day'];
  const rows = [...S.tx]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => [t.date, t.type, catOf(t.cat).name, ACC[t.acct]?.name || '', t.amount, t.note || '', t.rid ? 'monthly' : '', dayInfo(t.date).note, '']);
  const nsRows = Object.entries(S.days).filter(([, v]) => v.ns).map(([d, v]) => [d, '', '', '', 0, '', '', v.note, 'yes']);
  const cell = v => '"' + String(v).replaceAll('"', '""') + '"';
  return [header, ...rows, ...nsRows].map(r => r.map(cell).join(',')).join('\n');
}

function restoreBackup() {
  try {
    const d = JSON.parse($('#s-text').value);
    if (!Array.isArray(d.tx)) throw new Error('Backup has no transactions');
    S = { skip: [], goals: [], days: {}, budgets: { total: 0, cats: {} }, ...d };
    finish('Restored');
  } catch {
    toast("That backup didn't look right");
  }
}

function settingRow(id, emoji, color, label, danger) {
  const style = danger ? 'style="color:var(--red)"' : '';
  return `<button type="button" class="row" id="${id}">${icon(emoji, color)}<span class="mid"><b ${style}>${label}</b></span>${IC.chev}</button>`;
}

function settingsSheet() {
  const cur = segControl('s-cur', CURRENCIES.map(c => [c, c.trim()]), S.currency, 'big');
  openSheet({
    title: 'Settings',
    body: `<p class="label">Currency</p>${cur}
    <p class="label">Your data</p>
    <div class="group">
      ${settingRow('s-export', '📋', 'var(--blue)', 'Copy Backup')}
      ${settingRow('s-import', '📥', 'var(--green)', 'Restore Backup')}
      ${settingRow('s-csv', '📊', 'var(--orange)', 'Copy as CSV')}
    </div>
    <div class="group hidden" id="s-imp-wrap"><textarea class="note mono" id="s-text" placeholder="Paste your backup here"></textarea><button type="button" class="row" id="s-import-go" style="justify-content:center;color:var(--tint);font-weight:600">Restore</button></div>
    <p class="footnote" style="margin:-6px 16px 16px">Everything stays on this iPhone. Copy a backup now and then and keep it in Notes.</p>
    <p class="label">Start over</p>
    <div class="group">
      ${settingRow('s-demo', '✨', 'var(--purple, #bf5af2)', 'Load Sample Data')}
      ${settingRow('s-clear', '🗑️', 'var(--red)', 'Erase Everything', true)}
    </div>`,
  });
  $('#s-cur').addEventListener('click', e => {
    const b = e.target.closest('button');
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
  $('#s-demo').addEventListener('click', () => alertBox('Load sample data?', 'This replaces what you have now with 6 months of example data.', 'Load Sample Data', () => {
    S = seed();
    runRecurring();
    month = CUR_YM;
    finish('Sample data loaded');
  }));
  $('#s-clear').addEventListener('click', () => alertBox('Erase everything?', 'All transactions, notes, budgets and goals will be deleted from this iPhone. This can\'t be undone.', 'Erase Everything', () => {
    S = { currency: S.currency, tx: [], days: {}, skip: [], budgets: { total: 0, cats: {} }, goals: [] };
    month = CUR_YM;
    finish('Erased');
  }));
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, action) {
  const root = $('#toast-root');
  const btn = action ? `<button type="button" id="toast-act">${esc(action.label)}</button>` : '';
  root.innerHTML = `<div class="toast glass ${action ? '' : 'no-undo'}" role="status"><span>${esc(msg)}</span>${btn}</div>`;
  if (action) {
    $('#toast-act').addEventListener('click', () => {
      root.innerHTML = '';
      action.fn();
    });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, action ? 4500 : 2200);
}

/* ---------- swipe to delete ---------- */
const SW = { el: null, x0: 0, y0: 0, dx: 0, base: 0, lock: null };
let openSwipe = null;
let swipedAt = 0;
const setSwipeX = (el, x) => {
  const row = el.querySelector(':scope > .row');
  if (row) row.style.transform = x ? `translateX(${x}px)` : '';
};
function closeOpenSwipe() {
  if (!openSwipe) return false;
  setSwipeX(openSwipe, 0);
  openSwipe = null;
  return true;
}
document.addEventListener('touchstart', e => {
  const el = e.target.closest('.swipe');
  if (openSwipe && openSwipe !== el) closeOpenSwipe();
  if (!el || e.target.closest('.swipe-del')) return;
  const p = e.touches[0];
  Object.assign(SW, { el, x0: p.clientX, y0: p.clientY, dx: 0, base: el === openSwipe ? -SWIPE_W : 0, lock: null });
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!SW.el) return;
  const p = e.touches[0];
  const dx = p.clientX - SW.x0;
  const dy = p.clientY - SW.y0;
  if (SW.lock === null && Math.abs(dx) + Math.abs(dy) > 8) SW.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (SW.lock !== 'x') return;
  SW.dx = dx;
  SW.el.classList.add('dragging');
  setSwipeX(SW.el, Math.min(0, Math.max(-SWIPE_W - 40, SW.base + dx)));
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!SW.el) return;
  const el = SW.el;
  SW.el = null;
  el.classList.remove('dragging');
  if (SW.lock !== 'x') return;
  swipedAt = Date.now();
  const open = SW.base + SW.dx < -SWIPE_W / 2;
  setSwipeX(el, open ? -SWIPE_W : 0);
  openSwipe = open ? el : null;
});

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
  'del-tx': el => deleteTx(el.dataset.id),
  day: el => daySheet(el.dataset.date),
  'mark-ns': el => markNoSpend(el.dataset.date),
  filter: el => {
    filter = el.dataset.f;
    document.querySelectorAll('[data-act=filter]').forEach(b => b.classList.toggle('sel', b === el));
    renderTxList();
  },
  'edit-total': () => numberSheet({
    title: 'Monthly Budget',
    value: S.budgets.total,
    hint: 'The total you want to spend each month, including rent and bills.',
    onSave: v => { S.budgets.total = v; },
  }),
  'edit-cat-budget': el => catBudgetSheet(el.dataset.cat),
  'add-cat-budget': () => pickCategorySheet(),
  'edit-goal': el => goalSheet(S.goals.find(g => g.id === el.dataset.id)),
  'new-goal': () => goalSheet(null),
};

document.addEventListener('click', e => {
  if (Date.now() - swipedAt < 350) return;
  if (!e.target.closest('.swipe-del') && closeOpenSwipe()) return;
  const tb = e.target.closest('.tb');
  if (tb) {
    goTo(tb.dataset.tab);
    return;
  }
  const mode = e.target.closest('#act-mode button');
  if (mode) {
    actMode = mode.dataset.v;
    render();
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
window.addEventListener('scroll', () => {
  $('#navbar').classList.toggle('show', window.scrollY > 48);
}, { passive: true });
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
