// UI 용어 사전 — 공용 동작. 스크립트가 꺼져 있어도 글은 전부 보인다.
// 순서: 0) 설정 읽기  1) 영문이면 번역 적용  2) 상단 바  3) 옆 목록  4) 카드  5) 이전·다음  6) 점검

const root = document.documentElement;
const BASE = document.currentScript ? document.currentScript.src.replace(/app\.js.*$/, '') : '';
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const query = new URLSearchParams(location.search);
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

// 0) 설정: 밝기, 언어, 움직임
if (store.get('theme')) root.dataset.theme = store.get('theme');
const lang = query.get('lang') || store.get('lang') || 'ko';
if (store.get('still') === '1') root.classList.add('still');

// 번역 사전. 영문일 때만 불러온다: assets/en.js(공용) + 주제 폴더의 en.js(그 페이지)
let DICT = {}, BLOCKS = {};
window.tr = s => (lang === 'en' && DICT[s]) || s;
const load = src => new Promise(done => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = done; document.head.append(s); });
const hasTerms = !!document.querySelector('.term');
const ready = lang !== 'en' ? Promise.resolve() : Promise.all([load(BASE + 'en.js'), hasTerms ? load('en.js') : null]).then(() => {
  DICT = { ...(window.EN_GLOBAL || {}).texts, ...(window.EN_PAGE || {}).texts };
  BLOCKS = (window.EN_PAGE || {}).blocks || {};
});

// 카드에서 접어 두는 네 칸: [문단 클래스, 기본 이름, 아이콘]
const MORE = [
  ['desc',   '설명',           svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')],
  ['when',   '언제 쓰나',       svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')],
  ['prompt', 'AI에게 이렇게',   svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>')],
  ['senior', '실무 팁',         svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>')],
];
const BLOCK_SEL = '.desc, .when, .prompt, .senior';
const key = s => s.replace(/\s+/g, ' ').trim();

// 1) 영문 적용: 긴 글 네 칸은 카드별로 통째로 바꾸고, 나머지 글자(예시 속 글자 포함)는 사전에서 찾아 바꾼다
function translateNode(n) {
  const k = key(n.nodeValue); if (!k) return;
  const v = DICT[k]; if (!v || v === k) return;                 // 바꿀 것이 없으면 건드리지 않는다(같은 값으로 다시 쓰면 끝없이 반복된다)
  const next = n.nodeValue.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, a, b) => a + v + b);
  if (next !== n.nodeValue) n.nodeValue = next;
}
function translateTree(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('script, style, ' + BLOCK_SEL) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(translateNode);
  const els = el.querySelectorAll ? [el, ...el.querySelectorAll('[placeholder], [aria-label], [title], [alt], [value]')] : [];
  for (const e of els) for (const a of ['placeholder', 'aria-label', 'title', 'alt', 'value']) {
    const v = e.getAttribute && e.getAttribute(a); if (v && DICT[key(v)]) e.setAttribute(a, DICT[key(v)]);
  }
}
function applyEnglish() {
  root.lang = 'en';
  document.querySelectorAll('.term[id]').forEach(t => {
    const b = BLOCKS[t.id]; if (!b) return;
    for (const [k] of MORE) { const p = t.querySelector(':scope > .body > .' + k); if (p && b[k]) p.innerHTML = b[k]; }
  });
  translateTree(document.body);
  document.title = document.title.split(' · ').map(s => window.tr(key(s))).join(' · ');
  // 예시가 스스로 바꾸는 글자(예: "복사됨")도 따라 바꾼다
  let busy = false;
  new MutationObserver(list => {
    if (busy) return; busy = true;
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      for (const n of m.addedNodes) n.nodeType === 3 ? translateNode(n) : n.nodeType === 1 && translateTree(n);
    }
    busy = false;
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}

ready.then(() => {
  if (lang === 'en') applyEnglish();
  const tr = window.tr;

  // 2) 상단 바: 홈, 찾기(목차만), 이전·다음(주제만), 움직임, 언어, 밝기
  const bar = document.querySelector('.top');
  let tools = null;
  if (bar) {
    tools = bar.querySelector('.ui-tools');
    if (!tools) { tools = document.createElement('div'); tools.className = 'ui-tools'; bar.append(tools); }
    const button = (label, html, onclick) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ui-tool'; b.innerHTML = html; b.title = label; b.setAttribute('aria-label', label); b.onclick = onclick;
      return b;
    };
    // 홈: 왼쪽 맨 앞
    const homeLink = bar.querySelector('a[href$="index.html"]:not(.brand)');
    if (homeLink) {
      const home = document.createElement('a');
      home.className = 'ui-tool ui-home'; home.href = homeLink.getAttribute('href');
      home.innerHTML = svg('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>');
      home.title = tr('홈으로'); home.setAttribute('aria-label', home.title);
      bar.prepend(home);
    }
    // 움직임: 예시는 늘 재생된다(움직임이 곧 내용이라서). 멈추고 싶은 사람은 여기서 멈춘다
    const PAUSE = svg('<path d="M9 5v14M15 5v14"/>'), PLAY = svg('<path d="M7 5l12 7-12 7z"/>');
    const still = () => root.classList.contains('still');
    const motion = button('', '', () => { root.classList.toggle('still'); store.set('still', still() ? '1' : '0'); paintMotion(); });
    const paintMotion = () => { motion.innerHTML = still() ? PLAY : PAUSE; motion.title = tr(still() ? '예시 움직이기' : '예시 멈추기'); motion.setAttribute('aria-label', motion.title); };
    paintMotion();
    // 언어: 누르면 다른 언어로 다시 연다(보던 카드 위치는 유지)
    const other = lang === 'en' ? 'ko' : 'en';
    const langBtn = button(lang === 'en' ? '한국어로 보기' : 'View in English', `<b>${lang === 'en' ? '한' : 'EN'}</b>`, () => {
      store.set('lang', other);
      const cur = document.querySelector('.ui-side [aria-current]');
      const u = new URL(location.href); u.searchParams.delete('lang'); if (cur) u.hash = cur.hash;
      const same = u.href === location.href;
      location.href = u.href; if (same || u.hash) location.reload();
    });
    // 밝기
    const SUN = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
    const MOON = svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>');
    const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = button('', '', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('theme', root.dataset.theme); paintTheme(); });
    const paintTheme = () => { theme.innerHTML = isDark() ? SUN : MOON; theme.title = tr(isDark() ? '밝은 화면으로' : '어두운 화면으로'); theme.setAttribute('aria-label', theme.title); };
    paintTheme();
    tools.append(motion, langBtn, theme);
  }

  // 3) 옆 목록: 이 페이지의 용어. 스크롤하면 지금 보는 용어에 색이 들어온다
  const first = document.querySelector('.terms');
  if (first) {
    const main = first.parentElement, terms = [...document.querySelectorAll('.term[id]')];
    const nav = document.createElement('nav');
    nav.className = 'ui-side'; nav.setAttribute('aria-label', tr('이 페이지의 용어'));
    const links = terms.map(t => {
      const name = t.querySelector('.term-name').cloneNode(true);
      name.querySelector('.en')?.remove();
      const a = document.createElement('a');
      a.href = '#' + t.id; a.textContent = key(name.textContent);
      nav.append(a);
      return a;
    });
    main.classList.add('with-side'); main.prepend(nav);

    // 기준선: 보통은 화면 가운데. 맨 위와 맨 아래에서는 가운데에 올 수 없는 용어가 있으니,
    // 처음 반 화면 동안 기준선이 위에서 가운데로, 끝 반 화면 동안 가운데에서 아래로 옮겨 간다.
    let current = -1, queued = false, locked = false;
    const mark = i => {
      if (i === current) return;
      links[current]?.removeAttribute('aria-current');
      current = i;
      const a = links[i];
      a.setAttribute('aria-current', 'true');
      if (nav.scrollHeight > nav.clientHeight) nav.scrollTo({ top: a.offsetTop - nav.clientHeight / 2 + a.offsetHeight / 2, behavior: 'smooth' });
      else if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    };
    const spy = () => {
      queued = false;
      if (locked) return;
      const h = innerHeight, mid = h / 2, left = document.documentElement.scrollHeight - h - scrollY;
      const line = scrollY < mid ? scrollY : left < mid ? h - Math.max(left, 0) : mid;
      let best = 0, dist = Infinity;
      terms.forEach((t, i) => {
        const r = t.getBoundingClientRect(), d = line < r.top ? r.top - line : line > r.bottom ? line - r.bottom : 0;
        if (d < dist) { dist = d; best = i; }
      });
      mark(best);
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
    addEventListener('resize', spy);
    let unlock;
    links.forEach((a, i) => a.addEventListener('click', e => {
      e.preventDefault();
      locked = true; mark(i);
      terms[i].scrollIntoView({ block: 'center' });
      history.replaceState(null, '', a.hash);
      clearTimeout(unlock); unlock = setTimeout(() => { locked = false; }, 900);
    }));
    addEventListener('scrollend', () => { clearTimeout(unlock); locked = false; });
    const at = terms.findIndex(t => '#' + t.id === decodeURIComponent(location.hash));
    if (at >= 0) { mark(at); terms[at].scrollIntoView({ block: 'center', behavior: 'instant' }); } else spy();

    // 5) 이전·다음 주제: 위에는 상단 바의 화살표, 아래에는 큰 카드. 순서는 pages.js(목차-만들기.py 가 만든다)
    load(BASE + 'pages.js').then(() => {
      const here = decodeURIComponent(location.pathname), all = window.PAGES || [];
      const k = all.findIndex(([href]) => here.endsWith('/' + href));
      if (k < 0) return;
      const prev = all[k - 1], next = all[k + 1], to = p => '../../' + p[0];
      const arrow = (p, label, d) => {
        const a = document.createElement(p ? 'a' : 'span');
        a.className = 'ui-tool'; a.innerHTML = svg(d);
        if (p) { a.href = to(p); a.title = tr(label) + ': ' + tr(p[1]); a.setAttribute('aria-label', a.title); } else a.setAttribute('aria-disabled', 'true');
        return a;
      };
      tools?.prepend(arrow(prev, '이전 주제', '<path d="M15 5l-7 7 7 7"/>'), arrow(next, '다음 주제', '<path d="M9 5l7 7-7 7"/>'));
      const pager = document.createElement('nav');
      pager.className = 'ui-pager'; pager.setAttribute('aria-label', tr('이전·다음 주제'));
      pager.innerHTML = [[prev, '이전', 'prev'], [next, '다음', 'next']].map(([p, label, cls]) =>
        p ? `<a class="${cls}" href="${to(p)}"><small>${tr(label)}</small><b>${tr(p[1])}</b></a>` : '<span></span>').join('');
      main.append(pager);
    });
  }

  // 4) 카드: 글 네 칸을 접고 아이콘 네 칸으로 연다. 한 번에 하나만 열린다.
  //    컨트롤은 제자리에 있고, 그 아래 자리의 높이만 지금 값에서 새 값으로 부드럽게 바뀐다.
  document.querySelectorAll('.term .body').forEach(body => {
    const seg = document.createElement('div');
    seg.className = 'ui-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', tr('더 보기'));
    const panel = document.createElement('div'), inner = document.createElement('div');
    panel.className = 'ui-panel'; inner.className = 'ui-panel-in'; panel.append(inner);
    const pairs = [];
    for (const [k, name, icon] of MORE) {
      const p = body.querySelector(':scope > .' + k);
      if (!p) continue;
      p.hidden = true; inner.append(p);
      const label = p.querySelector(':scope > b')?.textContent.trim() || tr(name);   // 페이지마다 다른 이름표("이렇게 구분" 등)를 그대로 쓴다
      if (k === 'desc') p.insertAdjacentHTML('afterbegin', `<b>${tr(name)}</b>`);
      if (k === 'prompt') {
        const q = p.querySelector('q');
        if (q) {
          const c = document.createElement('button');
          c.className = 'ui-copy'; c.type = 'button'; c.textContent = tr('복사');
          c.onclick = () => navigator.clipboard.writeText(q.textContent.trim()).then(() => { c.textContent = tr('복사됨'); setTimeout(() => c.textContent = tr('복사'), 1200); });
          p.prepend(c);
        }
      }
      const b = document.createElement('button');
      b.type = 'button'; b.innerHTML = icon;
      b.title = label; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        pairs.forEach(([btn, para]) => {
          const open = btn === b && para.hidden;
          para.hidden = !open; btn.setAttribute('aria-pressed', String(open));
        });
        const any = pairs.some(([, para]) => !para.hidden);
        panel.style.height = (any ? inner.offsetHeight : 0) + 'px';   // 닫히면 0, 열리면 그 글의 높이
      };
      pairs.push([b, p]); seg.append(b);
    }
    body.querySelector('.term-name')?.after(seg, panel);
  });
  addEventListener('resize', () => document.querySelectorAll('.ui-panel').forEach(p => { if (p.offsetHeight) p.style.height = p.firstChild.offsetHeight + 'px'; }));

  // 6) 점검용: 주소 끝에 ?check 를 붙이면 예시가 무대 밖으로 잘리는 카드에 빨간 테두리를 친다.
  //    ?check=390 처럼 숫자를 주면 본문 폭을 그 값으로 좁혀서(폰 폭) 점검한다
  if (query.has('check')) {
    const run = () => {
      const w = +query.get('check');
      if (w) { const m = document.querySelector('main'); m.style.maxWidth = w + 'px'; m.style.margin = '0'; }
      const cut = [...document.querySelectorAll('.term')].filter(t => {
        const d = t.querySelector('.demo');
        return d.scrollWidth > d.clientWidth + 4 || d.scrollHeight > d.clientHeight + 4;
      });
      cut.forEach(t => t.style.outline = '4px solid red');
      document.body.dataset.cut = cut.map(t => t.id).join(',');
    };
    document.readyState === 'complete' ? run() : addEventListener('load', run);
  }
  document.body.dataset.ready = '1';
});
