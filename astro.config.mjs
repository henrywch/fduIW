import { defineConfig } from "astro/config";

// GitHub Pages serves this repo under /<repo>/ — build with
// GH_PAGES_BASE=/fduIW/ (see tools/deploy_gh_pages.mjs). Root deploys
// (EdgeOne etc.) keep the default base.
const ghBase = process.env.GH_PAGES_BASE; // e.g. "/fduIW/"
const gh = !!ghBase;

// zh-CN is the default locale at site root; English lives under /en/.
// Pages are hand-mirrored per locale (not auto-generated) because copy is
// written natively in both languages, not machine-translated.
export default defineConfig({
  site: gh ? "https://henrywch.github.io" : undefined,
  base: ghBase || "/",
  outDir: gh ? ".gh-pages" : "dist",
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
    routing: {
      prefixDefaultLocale: false,
      fallbackType: "redirect",
    },
  },
  build: { format: "directory" },
  trailingSlash: "ignore",
});
