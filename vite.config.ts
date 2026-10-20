// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * GitHub-Pages-Build: `PAGES_BASE=/repo-name/ bun run build`.
 * Erzeugt eine statische SPA unter .output/public — ohne PAGES_BASE bleibt
 * alles beim Lovable-Standard (Cloudflare-Target, Basis "/").
 */
const pagesBase = process.env.PAGES_BASE;

export default defineConfig({
  vite: { base: pagesBase ?? "/" },
  ...(pagesBase
    ? {
        tanstackStart: { spa: { enabled: true } },
        nitro: false,
      }
    : {}),
});
