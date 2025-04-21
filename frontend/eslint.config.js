import solid from "eslint-plugin-solid/configs/recommended";
import * as tsParser from "@typescript-eslint/parser";

export default [
  {
    ...solid,
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
];
