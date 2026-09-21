// Syncs raw manuscripts from assets/label/*.md into the Astro content
// collection at src/content/works/<slug>.md. `cats` classify works
// multi-membership-style (fantasy | illustration | workview) — the registry
// file works.registry.jsonl is derived here too, one line per work.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LABEL_DIR = path.join(ROOT, "assets", "label");
const OUT_DIR = path.join(ROOT, "src", "content", "works");
const REGISTRY = path.join(ROOT, "src", "content", "works.registry.jsonl");

// slug -> { label file, cover (under /assets/image/), latin tagline }
const WORKS = [
  { slug: "hangzhou-twelve-hours", file: "2024-05-29-杭城十二时辰.md",
    cover: "杭城十二时辰-封面.png", latin: "Hora Duodecim Hangzhou" },
  { slug: "cyber-fortune-telling", file: "2024-06-01-你算命了吗.md",
    cover: "cyber-fortune-telling.png", latin: "Hast Thou Consulted Fate?" },
  { slug: "midnight-broadcast-notes", file: "2024-06-01-婺城午夜电台札记.md",
    altFile: "2024-06-01-ð-çŒ城午夜电台札记.md",
    cover: "midnight-broadcast.jpg", latin: "Midnight Airwave Journals" },
  { slug: "silver-age", file: "2024-06-01-白银时代.md",
    cover: "sunset-factory.jpg", latin: "Argenteum Saeculum" },
];

// Original titles are garbled in legacy files (encoding accident).
const TITLE_FIX = { "ð-çŒ城午夜电台札记": "婺城午夜电台札记" };

function splitFrontmatter(text) {
  text = text.replace(/^﻿/, "");
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return [{}, text];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return [meta, m[2]];
}

function cleanBody(body) {
  return body
    .split("\n")
    .map((l) => l.replace(/^\s*`\t?`\s?/, "").trimEnd()) // legacy "`\t`" line markers
    .join("\n")
    .trim();
}

function yamlString(s) {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function main() {
  const lines = [];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const w of WORKS) {
    let p = path.join(LABEL_DIR, w.file);
    if (!fs.existsSync(p) && w.altFile) p = path.join(LABEL_DIR, w.altFile);
    const raw = fs.readFileSync(p, "utf8");
    const [meta, bodyRaw] = splitFrontmatter(raw);
    let title = meta.title || w.slug;
    title = TITLE_FIX[title] || title;
    const date = w.file.slice(0, 10);
    const tags = (meta.tags || "")
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t !== "咕咕钦点的神作");
    const frontmatter = [
      "---",
      `title: ${yamlString(title)}`,
      `subtitle: ${yamlString(meta.subtitle || "")}`,
      `author: ${yamlString(meta.author || "")}`,
      `date: ${yamlString(date)}`,
      `cats: ["fantasy"]`,
      `tags: [${tags.map(yamlString).join(", ")}]`,
      `cover: ${yamlString("/assets/image/" + w.cover)}`,
      `latin: ${yamlString(w.latin)}`,
      `source: ${yamlString("assets/label/" + path.basename(p))}`,
      "---",
      "",
      cleanBody(bodyRaw),
      "",
    ].join("\n");
    fs.writeFileSync(path.join(OUT_DIR, w.slug + ".md"), frontmatter);
    console.log("synced", w.slug, "<-", path.basename(p));

    lines.push(JSON.stringify({
      slug: w.slug, title, author: meta.author || "", date,
      cats: ["fantasy"], cover: "/assets/image/" + w.cover, latin: w.latin,
    }));
  }
  fs.writeFileSync(REGISTRY, lines.join("\n") + "\n");
  console.log("registry ->", path.relative(ROOT, REGISTRY), `(${lines.length} entries)`);
}

main();
