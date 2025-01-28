import globals from "globals";
import tailwindcss from "eslint-plugin-tailwindcss";
import { fixupPluginRules, fixupConfigRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import reactCompiler from "eslint-plugin-react-compiler";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends("eslint:recommended"),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
      },

      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  ...compat.extends("plugin:tailwindcss/recommended").map((config) => ({
    ...config,
    files: ["**/*.{js,jsx,ts,tsx}"],
  })),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],

    plugins: {
      tailwindcss,
    },

    rules: {
      "tailwindcss/no-custom-classname": [
        2,
        {
          cssFiles: ["**/*.css"],
        },
      ],
    },
  },
  ...fixupConfigRules(
    compat.extends(
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",
      "plugin:react-hooks/recommended",
      "plugin:jsx-a11y/recommended",
      "prettier",
    ),
  ).map((config) => ({
    ...config,
    files: ["**/*.{js,jsx,ts,tsx}"],
  })),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],

    plugins: {
      react: fixupPluginRules(react),
      "jsx-a11y": fixupPluginRules(jsxA11Y),
      "react-compiler": reactCompiler,
    },

    settings: {
      react: {
        version: "detect",
      },

      formComponents: ["Form"],

      linkComponents: [
        {
          name: "Link",
          linkAttribute: "to",
        },
        {
          name: "NavLink",
          linkAttribute: "to",
        },
      ],
    },

    rules: {
      "react-compiler/react-compiler": "error",
      "react/prop-types": "off",
      "react/jsx-no-leaked-render": "off",
    },
  },
  ...fixupConfigRules(
    compat.extends(
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/stylistic",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier",
    ),
  ).map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}", "server.ts"],
  })),
  {
    files: ["**/*.{ts,tsx}", "server.ts"],

    plugins: {
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
      import: fixupPluginRules(_import),
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "script",

      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname, // or import.meta.dirname for ESM
      },
    },

    settings: {
      "import/internal-regex": "^~/",

      "import/resolver": {
        node: {
          extensions: [".ts", ".tsx"],
        },

        typescript: {
          alwaysTryTypes: true,
        },
      },
    },

    rules: {
      "import/order": [
        "error",
        {
          alphabetize: {
            caseInsensitive: true,
            order: "asc",
          },

          groups: ["builtin", "external", "internal", "parent", "sibling"],
          "newlines-between": "always",
        },
      ],

      "import/namespace": 0,
      "import/no-extraneous-dependencies": 2,
      "import/no-mutable-exports": 2,
      "import/no-unused-modules": 2,
      "import/no-unresolved": 2,
      "import/consistent-type-specifier-style": ["error", "prefer-inline"],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-exports": 2,
      "@typescript-eslint/consistent-type-imports": 2,

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
