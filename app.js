// QA TestFlow site — live-run mock, interactive dependency map, tally and release sign-off.
const root = document.documentElement;
const reduce = root.classList.contains('rm');
const SVGNS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const kid of kids) if (kid) n.append(kid);
  return n;
}
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const onView = (node, fn, threshold = .35) => {
  if (!node) return;
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold });
  io.observe(node);
};

/* ---------------- Live test run (illustrative) ---------------- */
function initSession() {
  const list = document.getElementById('session-cases');
  const sum = document.getElementById('session-sum');
  const TESTERS = [{ i: 'AK', c: '#7ef29d' }, { i: 'NS', c: '#5cc8ff' }, { i: 'RJ', c: '#b197fc' }];
  const cases = [
    ['Apply a valid coupon', 'PASS'],
    ['Expired coupon shows an error', 'PASS'],
    ['Pay with a saved card', 'FAIL'],
    ['Order total includes tax', 'PASS'],
    ['Guest checkout', 'SKIP'],
    ['Empty cart cannot check out', 'PASS'],
  ].map(([name, result], k) => ({ name, result, status: 'PENDING', who: TESTERS[k % 3] }));
  const rows = cases.map((c) => {
    const st = el('span', { class: 'st' });
    const who = el('span', { class: 'who', text: '' });
    const li = el('li', {}, el('span', { text: c.name }), st, who);
    list.append(li);
    return { c, li, st, who };
  });
  const render = () => {
    rows.forEach(({ c, st, who }) => {
      st.className = `st st-${c.status}`;
      st.textContent = c.status === 'PENDING' ? 'Pending' : c.status.charAt(0) + c.status.slice(1).toLowerCase();
      if (c.status === 'PENDING') { who.textContent = ''; who.style.removeProperty('--c'); } else { who.textContent = c.who.i; who.style.setProperty('--c', c.who.c); }
    });
    const n = (s) => cases.filter((c) => c.status === s).length;
    sum.replaceChildren(
      el('span', {}, el('b', { class: 'st-PASS', text: String(n('PASS')) }), document.createTextNode(' pass')),
      el('span', {}, el('b', { class: 'st-FAIL', text: String(n('FAIL')) }), document.createTextNode(' fail')),
      el('span', {}, el('b', { class: 'st-PENDING', text: String(n('PENDING')) }), document.createTextNode(' pending')),
    );
  };
  if (reduce) { cases.forEach((c, k) => { if (k < 4) c.status = c.result; }); render(); return; }
  render();
  let k = 0;
  setInterval(() => {
    if (document.hidden) return;
    if (k >= cases.length) { cases.forEach((c) => { c.status = 'PENDING'; }); k = 0; render(); return; }
    const row = rows[k];
    row.c.status = row.c.result;
    render();
    row.li.classList.add('flash');
    setTimeout(() => row.li.classList.remove('flash'), 900);
    k++;
  }, 1600);
}

/* ---------------- Dependency map demo ---------------- */
function initDependencyMap() {
  const host = document.getElementById('dep-svg');
  if (!host) return;
  const W = 150, H = 52;
  const N = {
    signin: ['Sign-in', 30, 40], catalog: ['Catalog', 30, 184], pricing: ['Pricing', 30, 328],
    account: ['Account', 262, 40], cart: ['Cart', 262, 184], coupons: ['Coupons', 262, 328],
    checkout: ['Checkout', 494, 112], recs: ['Recommendations', 494, 256],
    payment: ['Payment', 726, 40], shipping: ['Shipping', 726, 184], receipts: ['Receipts', 726, 328],
  };
  // a → b means b depends on a: change a, and b needs retesting.
  const E = [['signin', 'account'], ['catalog', 'cart'], ['pricing', 'cart'], ['pricing', 'coupons'], ['account', 'checkout'],
    ['cart', 'checkout'], ['coupons', 'checkout'], ['cart', 'recs'], ['catalog', 'recs'], ['checkout', 'payment'],
    ['checkout', 'shipping'], ['payment', 'receipts'], ['shipping', 'receipts']];

  const edgeEls = E.map(([a, b]) => {
    const [, ax, ay] = N[a]; const [, bx, by] = N[b];
    let d;
    if (ax === bx) {
      d = `M${ax + W / 2} ${ay + H} C ${ax + W / 2} ${ay + H + 40}, ${bx + W / 2} ${by - 40}, ${bx + W / 2} ${by}`;
    } else {
      const x1 = ax + W, y1 = ay + H / 2, x2 = bx, y2 = by + H / 2, m = (x1 + x2) / 2;
      d = `M${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`;
    }
    const p = svg('path', { d, class: 'dep-edge' });
    host.append(p);
    return { a, b, p };
  });
  const nodeEls = {};
  Object.entries(N).forEach(([id, [label, x, y]]) => {
    const g = svg('g', { class: 'dep-node', tabindex: '0', role: 'button', 'aria-label': `${label}: show what depends on it` });
    g.append(svg('rect', { x, y, width: W, height: H, rx: 14 }));
    const t = svg('text', { x: x + W / 2, y: y + H / 2 + 5, 'text-anchor': 'middle' });
    t.textContent = label;
    const lvl = svg('text', { x: x + W - 10, y: y + 15, 'text-anchor': 'end', class: 'lvl' });
    g.append(t, lvl);
    host.append(g);
    nodeEls[id] = { g, lvl, label };
    const pick = () => select(id);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });

  const title = document.getElementById('dep-title');
  const sub = document.getElementById('dep-sub');
  const nEl = document.getElementById('dep-n');
  const depthEl = document.getElementById('dep-depth');
  const listEl = document.getElementById('dep-list');

  function select(src) {
    const depth = { [src]: 0 };
    const queue = [src];
    while (queue.length) {
      const cur = queue.shift();
      E.forEach(([a, b]) => { if (a === cur && depth[b] === undefined) { depth[b] = depth[cur] + 1; queue.push(b); } });
    }
    const hit = Object.keys(depth).filter((k) => k !== src).sort((a, b) => depth[a] - depth[b]);
    Object.entries(nodeEls).forEach(([id, n]) => {
      n.g.classList.toggle('src', id === src);
      n.g.classList.toggle('hit', id !== src && depth[id] !== undefined);
      n.g.classList.toggle('dim', depth[id] === undefined);
      n.lvl.textContent = id !== src && depth[id] !== undefined ? `L${depth[id]}` : '';
    });
    edgeEls.forEach(({ a, b, p }) => {
      const on = depth[a] !== undefined && depth[b] !== undefined && depth[b] === depth[a] + 1;
      p.classList.toggle('hot', on);
      p.classList.toggle('flow', on);
    });
    const maxD = hit.length ? Math.max(...hit.map((k) => depth[k])) : 0;
    title.textContent = nodeEls[src].label;
    sub.textContent = hit.length ? 'These features depend on it, directly or further down:' : 'Nothing depends on this feature, so only its own tests need to run.';
    nEl.textContent = String(hit.length);
    depthEl.textContent = String(maxD);
    listEl.replaceChildren(...hit.map((k, i) => {
      const li = el('li', {}, document.createTextNode(nodeEls[k].label), el('span', { text: depth[k] === 1 ? 'direct' : `level ${depth[k]}` }));
      li.style.setProperty('--i', i);
      return li;
    }));
  }
  select('pricing');
}

/* ---------------- Tally ring ---------------- */
function initTally() {
  const ring = document.getElementById('tally-ring');
  if (!ring) return;
  const C = 2 * Math.PI * 50;
  const target = { pass: 42, fail: 3, pend: 7 };
  const total = target.pass + target.fail + target.pend;
  const pass = ring.querySelector('.t-pass');
  const fail = ring.querySelector('.t-fail');
  const set = (k) => {
    const p = Math.round(target.pass * k), f = Math.round(target.fail * k), pe = total - p - f;
    pass.style.strokeDasharray = `${(p / total) * C} ${C}`;
    fail.style.strokeDasharray = `${(f / total) * C} ${C}`;
    fail.style.strokeDashoffset = `${-(p / total) * C}`;
    document.getElementById('tally-pct').textContent = `${Math.round((p / total) * 100)}%`;
    document.getElementById('tl-pass').textContent = p;
    document.getElementById('tl-fail').textContent = f;
    document.getElementById('tl-pend').textContent = pe;
  };
  set(0);
  onView(ring, () => {
    if (reduce) { set(1); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1800);
      set(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------------- Release sign-off chain ---------------- */
function initStages() {
  const list = document.getElementById('stages');
  if (!list) return;
  const items = [...list.children];
  const show = (n) => items.forEach((li, i) => { li.classList.toggle('done', i < n); li.classList.toggle('current', i === n); });
  if (reduce) { show(items.length); return; }
  show(0);
  onView(list, () => {
    let n = 0;
    const tick = () => { n++; show(n); if (n < items.length) setTimeout(tick, 520); };
    setTimeout(tick, 300);
  });
}

/* ---------------- Reveal, progress, menu ---------------- */
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
document.querySelectorAll('.reveal').forEach((n) => io.observe(n));
addEventListener('scroll', () => {
  root.style.setProperty('--p', (scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
}, { passive: true });
const nav = document.getElementById('nav');
const menuBtn = nav.querySelector('.menu-btn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));

initSession();
initDependencyMap();
initTally();
initStages();
