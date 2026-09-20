import { defineConfig } from "astro/config";

// zh-CN is the default locale at site root; English lives under /en/.
// Pages are hand-mirrored per locale (not auto-generated) because copy is
// written natively in both languages, not machine-translated.
export default defineConfig({
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
