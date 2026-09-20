import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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

export const collections = { works };
