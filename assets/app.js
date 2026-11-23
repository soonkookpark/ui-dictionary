// UI 용어 사전 — 주제 페이지 공용 동작. 스크립트가 꺼져 있어도 글은 전부 보인다.

const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
// 카드에서 접어 두는 네 칸: [문단 클래스, 이름, 아이콘]
const MORE = [
  ['desc',   '설명',            svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')],
  ['when',   '언제 쓰나',        svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')],
  ['prompt', 'AI에게 시킬 문장',  svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>')],
  ['senior', '20년차 메모',      svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>')],
];

// 0) 밝기 전환: 기기 설정을 따르다가, 상단 버튼으로 고르면 그 값을 기억한다
const root = document.documentElement;
try { const saved = localStorage.getItem('theme'); if (saved) root.dataset.theme = saved; } catch {}
const bar = document.querySelector('.top');
if (bar) {
  let tools = bar.querySelector('.ui-tools');
  if (!tools) { tools = document.createElement('div'); tools.className = 'ui-tools'; bar.append(tools); }
  const SUN = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
  const MOON = svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const t = document.createElement('button');
  t.type = 'button'; t.className = 'ui-tool';
  const paint = () => { t.innerHTML = isDark() ? SUN : MOON; t.setAttribute('aria-label', isDark() ? '밝은 화면으로' : '어두운 화면으로'); t.title = t.getAttribute('aria-label'); };
  t.onclick = () => { root.dataset.theme = isDark() ? 'light' : 'dark'; try { localStorage.setItem('theme', root.dataset.theme); } catch {} paint(); };
  paint(); tools.append(t);
}

// 1) 옆 내비게이션: 이 페이지의 용어 목록. 스크롤하면 화면 가운데에 가장 가까운 용어에 색이 들어온다
const first = document.querySelector('.terms');
if (first) {
  const main = first.parentElement, terms = [...document.querySelectorAll('.term[id]')];
  const nav = document.createElement('nav');
  nav.className = 'ui-side'; nav.setAttribute('aria-label', '이 페이지의 용어');
  const links = terms.map(t => {
    const name = t.querySelector('.term-name').cloneNode(true);
    name.querySelector('.en')?.remove();
    const a = document.createElement('a');
    a.href = '#' + t.id; a.textContent = name.textContent.replace(/\s+/g, ' ').trim();
    if (t.classList.contains('added')) a.className = 'added';
    nav.append(a);
    return a;
  });
  main.classList.add('with-side'); main.prepend(nav);

  // 기준선: 보통은 화면 가운데. 다만 맨 위와 맨 아래에서는 가운데에 올 수 없는 용어가 있으니,
  // 처음 반 화면을 스크롤하는 동안 기준선이 위에서 가운데로, 끝 반 화면 동안 가운데에서 아래로 옮겨 간다.
  let current = -1, queued = false, locked = false;
  const mark = i => {
    if (i === current) return;
    links[current]?.removeAttribute('aria-current');
    current = i;
    const a = links[i];
    a.setAttribute('aria-current', 'true');
    // 목록 안에서만 따라 움직인다(페이지 스크롤은 건드리지 않는다)
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
  // 목록에서 누르면: 바로 그 이름에 색이 들어오고, 그 카드가 화면 가운데로 온다
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

  // 이전·다음 주제: 위에는 상단 바의 화살표, 아래에는 큰 카드. 순서는 pages.js(목차-만들기.py 가 만든다)
  const me = document.currentScript, base = me ? me.src.replace(/app\.js.*$/, '') : '';
  const pg = document.createElement('script');
  pg.src = base + 'pages.js';
  pg.onload = () => {
    const here = decodeURIComponent(location.pathname), all = window.PAGES || [];
    const k = all.findIndex(([href]) => here.endsWith('/' + href));
    if (k < 0) return;
    const prev = all[k - 1], next = all[k + 1], to = p => '../../' + p[0];
    const tools = document.querySelector('.top .ui-tools');
    const arrow = (p, label, d) => {
      const a = document.createElement(p ? 'a' : 'span');
      a.className = 'ui-tool'; a.innerHTML = svg(d);
      if (p) { a.href = to(p); a.title = label + ': ' + p[1]; a.setAttribute('aria-label', a.title); } else a.setAttribute('aria-disabled', 'true');
      return a;
    };
    tools?.prepend(arrow(prev, '이전 주제', '<path d="M15 5l-7 7 7 7"/>'), arrow(next, '다음 주제', '<path d="M9 5l7 7-7 7"/>'));
    const pager = document.createElement('nav');
    pager.className = 'ui-pager'; pager.setAttribute('aria-label', '이전·다음 주제');
    pager.innerHTML = [[prev, '이전', 'prev'], [next, '다음', 'next']].map(([p, label, cls]) =>
      p ? `<a class="${cls}" href="${to(p)}"><small>${label}</small><b>${p[1]}</b></a>` : '<span></span>').join('');
    main.append(pager);
  };
  document.head.append(pg);
}

// 2) 카드: 글 네 칸을 접고 분절 컨트롤로 연다. 한 번에 하나만 열린다.
//    컨트롤은 제자리에 있고, 그 아래 자리의 높이만 지금 값에서 새 값으로 부드럽게 바뀐다.
document.querySelectorAll('.term .body').forEach(body => {
  const seg = document.createElement('div');
  seg.className = 'ui-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', '더 보기');
  const panel = document.createElement('div'), inner = document.createElement('div');
  panel.className = 'ui-panel'; inner.className = 'ui-panel-in'; panel.append(inner);
  const pairs = [];
  for (const [k, name, icon] of MORE) {
    const p = body.querySelector('.' + k);
    if (!p) continue;
    p.hidden = true; inner.append(p);
    const label = p.querySelector(':scope > b')?.textContent.trim() || name;
    if (k === 'desc') p.insertAdjacentHTML('afterbegin', `<b>${name}</b>`);
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

// 3) "AI에게 시킬 문장"마다 복사 버튼
document.querySelectorAll('.prompt').forEach(p => {
  const q = p.querySelector('q');
  if (!q) return;
  const b = document.createElement('button');
  b.className = 'ui-copy'; b.type = 'button'; b.textContent = '복사';
  b.onclick = () => navigator.clipboard.writeText(q.textContent.trim())
    .then(() => { b.textContent = '복사됨'; setTimeout(() => b.textContent = '복사', 1200); });
  p.prepend(b);
});

// 4) 기기에서 "동작 줄이기"를 켠 사람: 예시는 멈춰 두고, 보고 싶은 것만 눌러서 재생한다
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.term .demo').forEach(d => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ui-replay'; b.textContent = '움직임 보기';
    b.onclick = () => { d.classList.add('playing'); b.remove(); };
    d.append(b);
  });
}

// 5) 점검용: 주소 끝에 ?check 를 붙이면 예시가 무대 밖으로 잘리는 카드에 빨간 테두리를 친다
//    ?check=390 처럼 숫자를 주면 본문 폭을 그 값으로 좁혀서(폰 폭) 점검한다
if (location.search.startsWith('?check')) addEventListener('load', () => {
  const w = +location.search.split('=')[1];
  if (w) { const m = document.querySelector('main'); m.style.maxWidth = w + 'px'; m.style.margin = '0'; }
  const cut = [...document.querySelectorAll('.term')].filter(t => {
    const d = t.querySelector('.demo');
    return d.scrollWidth > d.clientWidth + 4 || d.scrollHeight > d.clientHeight + 4;
  });
  cut.forEach(t => t.style.outline = '4px solid red');
  document.body.dataset.cut = cut.map(t => t.id).join(',');
});
