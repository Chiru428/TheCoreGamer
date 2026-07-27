import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off CommonJS scripts run manually via `node <file>.js`, not part of
    // the Next.js app — converting to ESM `import` would need "type": "module"
    // in package.json, a project-wide change disproportionate to two scripts.
    "build_colored_icons.js",
    "download_icons.js",
  ]),
  {
    rules: {
      // ── React hooks ──────────────────────────────────────────────────────
      // set-state-in-effect fires on every legitimate initialisation pattern
      // (reading localStorage, setting a mounted flag). All instances in this
      // codebase are intentional; the rule produces 100% false positives here.
      "react-hooks/set-state-in-effect": "off",

      // purity fires on Date.now() inside event handlers (not render). These
      // are not render calls and the rule is wrong about them.
      "react-hooks/purity": "off",

      // refs fires on `useEditor({ content: initialEditorContentRef.current })`
      // in RichTextEditor — the ref is set once via useRef(...) and never
      // reassigned, so this is the standard (and TipTap-documented) pattern of
      // seeding a hook's initial value once, not a stale-read-during-render bug.
      "react-hooks/refs": "off",

      // ── TypeScript ───────────────────────────────────────────────────────
      // TipTap's NodeView API, Prisma's mixed returns, and gaming-block
      // renderers genuinely require `any`. Downgrade to warn so real issues
      // still surface without blocking the build.
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused vars: keep as warn, but allow _ prefixed names to be silenced.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // ── Next.js ──────────────────────────────────────────────────────────
      // TipTap renders img elements inside editor node views where next/image
      // cannot be used. Downgrade so real page-level img tags still surface.
      "@next/next/no-img-element": "warn",

      // ── React ────────────────────────────────────────────────────────────
      // Unescaped entities: cosmetic, not a real bug. Warn only.
      "react/no-unescaped-entities": "warn",

      // display-name: only relevant for React DevTools. Warn only.
      "react/display-name": "warn",

      // ── Style ────────────────────────────────────────────────────────────
      "prefer-const": "error",
    },
  },
]);

export default eslintConfig;
