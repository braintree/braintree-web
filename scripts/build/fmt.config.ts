import type { OxfmtConfig } from "oxfmt";

export const fmt: OxfmtConfig = {
  trailingComma: "es5",
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  printWidth: 80,
  sortImports: false,
  sortPackageJson: false,
  ignorePatterns: [
    "dist",
    "src/coverage",
    "**/*.html",
    ".claude/settings.local.json",
  ],
};
