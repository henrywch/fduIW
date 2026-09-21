import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const bilingual = z.object({ zh: z.string(), en: z.string() });

const works = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/works" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().default(""),
    author: z.string().default(""),
    date: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().default(""),
    latin: z.string().default(""),
    source: z.string().default(""),
  }),
});

// one JSON file per member — build-time typed data (no runtime DB needed for
// a static site; this is the lightest high-performance storage there is)
const members = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/members" }),
  schema: z.object({
    name: z.string(),
    latin: z.string().default(""),
    glyph: z.string(),                        // key into the avatar-glyph set
    tags: z.object({ zh: z.array(z.string()), en: z.array(z.string()) }),
    blurb: bilingual,
    works: z.array(z.string()).default([]),   // work slugs, for future cross-links
    order: z.number().default(99),
  }),
});

// one Markdown file per activity entry.
// zh copy lives in the body; en copy in frontmatter `bodyEn` (HTML string).
const activities = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/activities" }),
  schema: z.object({
    title: bilingual,
    meta: bilingual,                          // the mono date-chip line
    bodyEn: z.string().default(""),           // plain-HTML paragraph(s)
    ongoing: z.boolean().default(false),
    plainCard: z.boolean().default(false),    // card style instead of living
    date: z.string(),                         // sortable YYYY-MM-DD
  }),
});

export const collections = { works, members, activities };

