import js from "@eslint/js";
import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextConfig,
  prettierConfig,
  {
    ignores: ["node_modules/", ".next/", "coverage/", "mcp-servers/"],
  },
];

export default config;
