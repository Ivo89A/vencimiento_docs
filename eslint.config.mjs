import { defineConfig, globalIgnores } from "eslint/config";
import javascript from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import typescript from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig([
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        group: ["@/infrastructure/**", "@/domains/**/*.service", "@/domains/auth/auth", "@/domains/auth/authorization"],
        message: "No importar persistencia ni servicios de servidor en componentes compartidos; usar contratos y rutas autorizadas.",
      }] }],
    },
  },
  globalIgnores([".next/**", "src/generated/**", ".agents/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
