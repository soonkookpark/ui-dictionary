"""주제 폴더들을 훑어서 맨 위 index.html(전체 목차)을 다시 만든다.
주제를 추가·수정한 뒤:  python assets/목차-만들기.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ICON = '<svg viewBox="0 0 24 24" aria-hidden="true">{}</svg>'
CHEVRON = ICON.format('<path d="M9 5l7 7-7 7"/>')

# 폴더 번호 -> (이름, 대표 예시의 바탕, 대표 예시 HTML). 예시 모양은 style.css 의 cv1~cv9.
CATS = {
    "01": ("헷갈리는 짝", "cv-tint",
           '<div class="cv1"><i class="tg"></i><span class="vs">vs</span><i class="cb">' + ICON.format('<path d="M5 12.5l4.5 4.5L19 7.500"/>') + "</i></div>"),
    "02": ("화면 구성요소", "cv-gray",
           '<div class="cv2 cv-card"><i style="height:3.5rem;width:3.5rem;border-radius:50%"></i><i style="height:.75rem;width:70%"></i>'
           '<i style="height:5rem"></i><i style="height:.75rem;width:85%"></i><span class="t">저장했어요</span></div>'),
    "03": ("이동과 아이콘", "cv-mint",
           '<div class="cv3 cv-card">'
           + "".join(f"<b>{ICON.format(d)}</b>" for d in (
               '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
               '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500"/>',
               '<path d="M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>',
               '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.500-4 5-5 8-5s6.500 1 8 5"/>'))
           + "</div>"),
    "04": ("레이아웃과 스타일", "cv-warm", '<div class="cv4"><i></i><i></i><i></i><i></i><i></i></div>'),
    "05": ("모션과 제스처", "cv-ink", '<div class="cv5"><i></i><i></i><i></i></div>'),
    "06": ("AI 화면", "cv-tint",
           '<div class="cv6"><p class="q">제주 일정 짜줘</p><p class="dots"><i></i><i></i><i></i></p>'
           '<p class="a"><span>첫날은 공항 근처부터 돌아보세요</span></p></div>'),
    "07": ("UX 지식", "cv-gray", '<div class="cv7"><i></i><i></i><i></i><i></i></div>'),
    "08": ("기본기", "cv-mint",
           '<div class="cv8 cv-card"><p class="aa"><b>가</b><b>가</b><b>가</b><b>가</b></p><p class="sw"><i></i><i></i><i></i><i></i></p></div>'),
    "09": ("버튼과 그 밖의 용어", "cv-warm", '<div class="cv9"><b>시작하기</b><b>자세히 보기</b><b>나중에</b></div>'),
}

TERM = re.compile(r'<article class="term[^"]*" id="([^"]+)">.*?<h2 class="term-name">(.*?)</h2>', re.S)
TAGS = re.compile(r"<[^>]+>")


def text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(TAGS.sub(" ", s))).strip()


def read_topic(page: Path) -> dict:
    src = page.read_text(encoding="utf-8")
    title = re.search(r"<h1>(.*?)</h1>", src, re.S)
    terms = []
    for tid, name in TERM.findall(src):
        en = re.search(r'<span class="en">(.*?)</span>', name, re.S)
        ko = text(re.sub(r'<span class="en">.*?</span>', "", name, flags=re.S))
        terms.append((tid, ko, text(en.group(1)) if en else ""))
    return {
        "href": page.relative_to(ROOT).as_posix(),
        "title": text(title.group(1)) if title else page.parent.name,
        "terms": terms,
    }


def build() -> str:
    """맨 위 목차를 만들어 돌려주고, 카테고리마다 한 단계 아래 페이지(NN-카테고리/index.html)도 쓴다."""
    out, order = [], []
    for cat_dir in sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name[:2] in CATS):
        name, tone, demo = CATS[cat_dir.name[:2]]
        rows, deep = [], []
        for page in sorted(cat_dir.glob("*/index.html")):
            t = read_topic(page)
            order.append([t["href"], t["title"]])
            here = page.parent.name + "/index.html"          # 카테고리 페이지에서 본 주소
            def links(base):
                return "".join(
                    f'<a href="{html.escape(base)}#{tid}" data-k="{html.escape((ko + " " + en).lower())}">{html.escape(ko)}</a>'
                    for tid, ko, en in t["terms"]
                )
            rows.append(
                f'<div class="topic"><a class="row" href="{html.escape(t["href"])}"><h3>{html.escape(t["title"])}</h3>{CHEVRON}</a>'
                f'<p class="tags">{links(t["href"])}</p></div>'
            )
            deep.append(
                f'<div class="topic"><a class="row" href="{html.escape(here)}"><h2>{html.escape(t["title"])}</h2>{CHEVRON}</a></div>'
            )
        if not rows:
            continue
        num, cat_href = cat_dir.name[:2], cat_dir.name + "/index.html"
        out.append(
            f'<section class="cat" id="cat-{num}"><a class="cv {tone}" href="{html.escape(cat_href)}" aria-label="{name} 열기">{demo}</a>'
            f'<div class="cat-body"><h2><a href="{html.escape(cat_href)}">{name}</a></h2><div class="topics">{"".join(rows)}</div></div></section>'
        )
        (cat_dir / "index.html").write_text(
            CAT_PAGE.replace("{name}", name).replace("{tone}", tone).replace("{demo}", demo).replace("{rows}", "".join(deep)),
            encoding="utf-8",
        )
    # 주제 페이지의 이전·다음 이동이 읽는 순서 목록
    (ROOT / "assets" / "pages.js").write_text("window.PAGES = " + json.dumps(order, ensure_ascii=False) + ";\n", encoding="utf-8")
    return PAGE.replace("{body}", "\n".join(out))


CAT_PAGE = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{name}: 움직이는 예시로 보는 UI 용어 사전">
<title>{name} · UI 용어 사전</title>
<script>try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="top">
  <a href="../index.html">UI 용어 사전</a><span class="sep">›</span>
  <span>{name}</span>
</header>
<main>
  <section class="hero">
    <h1>{name}</h1>
  </section>
  <div class="cv banner {tone}" aria-hidden="true">{demo}</div>
  <div class="topics list">{rows}</div>
</main>
<script src="../assets/app.js"></script>
</body>
</html>
"""


PAGE = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="화면에 보이는 것들의 이름을 움직이는 예시로 찾아보는 UI 용어 사전">
<title>UI 용어 사전</title>
<script>document.documentElement.classList.add('js'); try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="top">
  <a class="brand" href="index.html">UI 용어 사전</a>
  <div class="ui-tools">
    <input class="search" id="q" type="search" name="q" placeholder="용어 찾기" aria-label="용어 찾기" autocomplete="off" tabindex="-1">
    <button class="ui-tool" id="find" type="button" aria-label="용어 찾기" title="용어 찾기" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    </button>
  </div>
</header>
<main>
  <section class="hero">
    <h1>화면에 보이는 것들의 이름</h1>
    <p class="lead">움직이는 예시로 찾아보는 UI 용어 사전</p>
    <p class="count" id="count" aria-live="polite"></p>
  </section>
  <div class="cats">
{body}
  </div>
</main>
<script src="assets/app.js"></script>
<script>
// 찾기: 상단 돋보기를 누르면 그 자리에서 칸이 펼쳐진다. Esc 로 닫는다.
const topbar = document.querySelector('.top'), q = document.getElementById('q'), find = document.getElementById('find'), count = document.getElementById('count');
const openSearch = on => {
  topbar.classList.toggle('searching', on); find.setAttribute('aria-expanded', String(on)); q.tabIndex = on ? 0 : -1;
  if (on) q.focus(); else { q.value = ''; filter(); find.focus(); }
};
find.onclick = () => openSearch(!topbar.classList.contains('searching'));
q.addEventListener('keydown', e => { if (e.key === 'Escape') openSearch(false); });
addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); openSearch(true); } });
function filter() {
  const k = q.value.trim().toLowerCase();
  let hits = 0;
  document.querySelectorAll('.topic').forEach(row => {
    let any = !k || row.querySelector('h3').textContent.toLowerCase().includes(k);
    row.querySelectorAll('.tags a').forEach(a => {
      const hit = !!k && a.dataset.k.includes(k);
      a.classList.toggle('hit', hit);
      if (hit) { any = true; hits++; }
    });
    row.hidden = !any;
  });
  document.querySelectorAll('.cat').forEach(c => c.hidden = !c.querySelector('.topic:not([hidden])'));
  count.textContent = k ? (hits ? `용어 ${hits}개를 찾았습니다. 파란 이름을 누르면 그 카드로 갑니다.` : '찾는 용어가 없습니다. 다른 낱말이나 영어 이름으로 찾아보세요.') : '';
}
q.addEventListener('input', filter);
</script>
</body>
</html>
"""

if __name__ == "__main__":
    (ROOT / "index.html").write_text(build(), encoding="utf-8")
    print("index.html 을 다시 만들었습니다.")
