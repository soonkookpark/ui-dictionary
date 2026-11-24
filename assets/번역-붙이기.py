"""번역 결과(JSON)를 사이트가 읽는 파일로 바꾼다.
  주제 폴더마다 en.js  (그 페이지의 긴 글과 예시 속 글자)
  assets/en.js         (공용: 뼈대 글자, 카테고리·주제 제목, 모든 용어 이름)
사용: python assets/번역-붙이기.py <번역 폴더>     (번역 폴더 안에 src/NN.json, out/NN.json)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = Path(sys.argv[1])

# 뼈대와 목차의 글자
CHROME = {
    "UI 용어 사전": "UI Glossary",
    "화면에 보이는 것들의 이름": "The names of things on screen",
    "움직이는 예시로 찾아보는 UI 용어 사전": "A UI glossary you browse by live examples",
    "용어 찾기": "Find a term",
    "홈으로": "Home",
    "예시 움직이기": "Play examples",
    "예시 멈추기": "Pause examples",
    "밝은 화면으로": "Switch to light",
    "어두운 화면으로": "Switch to dark",
    "이 페이지의 용어": "Terms on this page",
    "이전 주제": "Previous topic",
    "다음 주제": "Next topic",
    "이전·다음 주제": "Previous and next topic",
    "이전": "Previous",
    "다음": "Next",
    "더 보기": "More",
    "설명": "Description",
    "언제 쓰나": "When to use",
    "AI에게 이렇게": "Prompt",
    "실무 팁": "Pro tip",
    "복사": "Copy",
    "복사됨": "Copied",
    # 카테고리
    "헷갈리는 짝": "Easily confused pairs",
    "화면 구성요소": "Screen components",
    "이동과 아이콘": "Navigation and icons",
    "레이아웃과 스타일": "Layout and style",
    "모션과 제스처": "Motion and gestures",
    "AI 화면": "AI interfaces",
    "UX 지식": "UX knowledge",
    "기본기": "Fundamentals",
    "버튼과 그 밖의 용어": "Buttons and more",
}
for ko in list(CHROME):
    CHROME[ko + " 열기"] = "Open " + CHROME[ko]

texts, done, missing = dict(CHROME), 0, []
for src_file in sorted((WORK / "src").glob("*.json")):
    src = json.loads(src_file.read_text(encoding="utf-8"))
    out_file = WORK / "out" / src_file.name
    if not out_file.exists():
        missing.append(src["page"]); continue
    out = json.loads(out_file.read_text(encoding="utf-8"))
    page_texts = {k: v for k, v in out.get("texts", {}).items() if v and v != k}   # 한글과 영어 표기가 같은 것은 바꿀 필요가 없다
    page_texts[src["title"]] = out["title"]
    page_texts.update({k: v for k, v in CHROME.items() if k in page_texts})   # 뼈대 글자는 어느 페이지에서나 같은 표기로
    (ROOT / src["page"] / "en.js").write_text(
        "window.EN_PAGE = " + json.dumps({"blocks": out.get("blocks", {}), "texts": page_texts}, ensure_ascii=False) + ";\n", encoding="utf-8")
    texts[src["title"]] = out["title"]                      # 주제 제목: 목차, 카테고리 페이지, 이전·다음에 쓰인다
    for aid, nm in src.get("names", {}).items():            # 용어 이름: 목차의 찾기 결과에 쓰인다
        en = nm.get("en") or page_texts.get(nm["ko"])
        if en and en != nm["ko"] and nm["ko"] not in CHROME: texts.setdefault(nm["ko"], en)
    done += 1

(ROOT / "assets" / "en.js").write_text("window.EN_GLOBAL = " + json.dumps({"texts": texts}, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"en.js 를 쓴 주제 {done}개, 공용 사전 {len(texts)}개")
if missing: print("번역이 없는 주제:", *missing, sep="\n  ")
