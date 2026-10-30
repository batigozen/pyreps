import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dev-dist",
      "coverage",
      "test-results",
      "playwright-report",
      ".venv",
      "public/pyodide",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["*.config.{js,ts}", "tests/e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
);
