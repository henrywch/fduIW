# -*- coding: utf-8 -*-
"""Convert assets/label/*.md into works/<slug>/index.html chapbook pages.

Prototype of the future sync agent: reads Markdown manuscripts with Jekyll-style
frontmatter, renders the chapbook template, and regenerates works/ detail pages.
Run from the website root:  python tools/build_works.py
"""
import os
import re
import sys
import html

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABEL_DIR = os.path.join(ROOT, "assets", "label")
WORKS_DIR = os.path.join(ROOT, "works")

# slug -> (label filename, cover under assets/image/, medium, latin tagline)
WORKS = [
    ("hangzhou-twelve-hours", "2024-05-29-杭城十二时辰.md",
     "杭城十二时辰-封面.png", "novel", "Hora Duodecim Hangzhou"),
    ("cyber-fortune-telling", "2024-06-01-你算命了吗.md",
     "cyber-fortune-telling.png", "novel", "Hast Thou Consulted Fate?"),
    ("midnight-broadcast-notes", "2024-06-01-ð-çŒ城午夜电台札记.md",
     "midnight-broadcast.jpg", "novel", "Midnight Airwave Journals"),
    ("silver-age", "2024-06-01-白银时代.md",
     "sunset-factory.jpg", "novel", "Argenteum Saeculum"),
]

# Original titles are garbled in two legacy files (encoding accident);
# keep the correction table here so builds stay reproducible.
TITLE_FIX = {"ð-çŒ城午夜电台札记": "婺城午夜电台札记"}


def parse_md(text):
    """Split frontmatter and body; return (meta dict, body str)."""
    text = text.lstrip("﻿")
    meta = {}
    body = text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            kv = line.split(":", 1)
            if len(kv) == 2:
                meta[kv[0].strip()] = kv[1].strip()
        body = m.group(2)
    return meta, body


def md_to_html(body):
    """Minimal renderer: paragraphs, ###/###### headings, blockquotes, emphasis."""
    out = []
    for block in re.split(r"\n\s*\n", body.strip()):
        b = block.strip()
        if not b:
            continue
        if b.startswith("######"):
            out.append("<h6>%s</h6>" % html.escape(b.lstrip("#").strip()))
            continue
        if b.startswith("###"):
            out.append("<h3>%s</h3>" % html.escape(b.lstrip("#").strip()))
            continue
        if b.startswith("*") and b.endswith("*") and len(b) < 400:
            out.append("<blockquote><p>%s</p></blockquote>" % html.escape(b.strip("*").strip()))
            continue
        lines = [l.strip().strip("`").replace("\t", "") for l in b.splitlines()]
        txt = html.escape("".join(lines))
        txt = re.sub(r"<(del|/del)>", "", txt)
        out.append("<p>%s</p>" % txt)
    return "\n".join(out)


TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · 空想花庭</title>
<meta name="description" content="{subtitle}">
<link rel="stylesheet" href="../../css/site.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=Cormorant+Garamond:ital@0;1&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<script>
(function(){{var t=localStorage.getItem("hds-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}})();
</script>
</head>
<body>
<header class="site-header detail-header">
  <a class="brand" href="../../index.html">
    <svg class="halo" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-18 16 16)"/></svg>
    <span>空想花庭</span>
  </a>
  <nav class="site-nav">
    <a href="../../index.html">关于</a>
    <a href="../../members.html">修士名录</a>
    <a href="../../activities.html">活动志</a>
    <a href="../../works.html" class="active">花庭</a>
    <div class="toggles">
      <a class="toggle-btn" href="../../en/works.html" title="English translation in progress">EN</a>
      <button class="toggle-btn" id="theme-toggle" type="button">◐</button>
    </div>
  </nav>
</header>
<main>
  <div class="chapbook">
    <div class="cover-rail"><img src="../../assets/image/{cover}" alt="{title} 封面"></div>
    <div class="chapbook-head">
      <div class="mono meta">CATALOGUE · {date} · 作者 {author}</div>
      <h1>{title}</h1>
      <div class="subtitle">{subtitle}</div>
      <div class="mono latin" style="margin-top:.5rem">{latin}</div>
      <div class="tags" style="margin-top:.8rem">{tags_html}</div>
    </div>
    <article>
{body}
    </article>
    <p class="mono meta" style="margin-top:3rem;text-align:center">编目于 {date} · source: assets/label/{source}</p>
  </div>
</main>
<footer class="site-footer">
  <div class="footer-cols">
    <div><h4>空想花庭</h4><p>复旦大学空想世界创作者协会 · 非官方网站</p></div>
    <div><h4>返回</h4><p><a href="../../works.html">花庭 · 画廊墙</a></p></div>
    <div><h4>公众号</h4><div class="qr-box">空想花庭</div></div>
  </div>
</footer>
<script src="../../js/site.js"></script>
</body>
</html>
"""


def main(out_root=None):
    works_dir = os.path.join(out_root, "works") if out_root else WORKS_DIR
    os.makedirs(works_dir, exist_ok=True)
    for slug, fname, cover, medium, latin in WORKS:
        path = os.path.join(LABEL_DIR, fname)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        meta, body = parse_md(text)
        title = meta.get("title", slug)
        title = TITLE_FIX.get(title, title)
        date = fname[:10]
        tags = re.findall(r"[^\[\],]+", meta.get("tags", "[]"))
        tags = [t.strip() for t in tags if t.strip()]
        tags_html = "".join('<span class="tag">%s</span>' % html.escape(t) for t in tags)
        page = TEMPLATE.format(
            slug=slug,
            title=html.escape(title),
            subtitle=html.escape(meta.get("subtitle", "")),
            author=html.escape(meta.get("author", "")),
            date=date,
            cover=cover,
            latin=html.escape(latin),
            tags_html=tags_html,
            body=md_to_html(body),
            source=html.escape(fname),
        )
        out_dir = os.path.join(works_dir, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(page)
        print("built", slug, "<-", fname)


if __name__ == "__main__":
    sys.exit(main())
