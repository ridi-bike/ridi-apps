/**
 * This is intended to be a basic starting point for linting in the Blues Stack.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },

  // Base config
  extends: ["eslint:recommended"],

  overrides: [
    // Tailwind
    {
      files: ["app/**/*.{js,jsx,ts,tsx}"],
      plugins: ["tailwindcss"],
      extends: ["plugin:tailwindcss/recommended"],
      rules: {
        "tailwindcss/no-custom-classname": [
          2,
          {
            cssFiles: ["app/**/*.css"],
          },
        ],
      },
    },

    // React
    {
      files: ["app/**/*.{js,jsx,ts,tsx}"],
      plugins: ["react", "jsx-a11y", "eslint-plugin-react-compiler"],
      extends: [
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
        "prettier",
      ],
      settings: {
        react: {
          version: "detect",
        },
        formComponents: ["Form"],
        linkComponents: [
          { name: "Link", linkAttribute: "to" },
          { name: "NavLink", linkAttribute: "to" },
        ],
      },
      rules: {
        "react-compiler/react-compiler": "error",
        "react/prop-types": "off",
        "react/jsx-no-leaked-render": "off",
      },
    },

    // Typescript
    {
      files: ["app/**/*.{ts,tsx}", "./server.ts"],
      plugins: ["@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
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
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/stylistic",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "prettier",
      ],
      parserOptions: {
        parser: "@typescript-eslint/parser",
        project: "./tsconfig.json",
      },
      rules: {
        "import/order": [
          "error",
          {
            alphabetize: { caseInsensitive: true, order: "asc" },
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

    // Markdown
    {
      files: ["app/**/*.md"],
      plugins: ["markdown"],
      extends: ["plugin:markdown/recommended", "prettier"],
    },

    // Jest/Vitest
    {
      files: ["**/*.test.{js,jsx,ts,tsx}"],
      plugins: ["jest", "jest-dom", "testing-library"],
      extends: [
        "plugin:jest/recommended",
        "plugin:jest-dom/recommended",
        "plugin:testing-library/react",
        "prettier",
      ],
      env: {
        "jest/globals": true,
      },
      settings: {
        jest: {
          // we're using vitest which has a very similar API to jest
          // (so the linting plugins work nicely), but it means we have to explicitly
          // set the jest version.
          version: 28,
        },
      },
    },

    // Cypress
    {
      files: ["cypress/**/*.ts"],
      env: {
        node: true,
      },
      plugins: ["cypress", "@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        project: "./tsconfig.json",
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/stylistic",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:cypress/recommended",
        "prettier",
      ],
      rules: {
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

    // Node
    {
      files: [".eslintrc.cjs", "mocks/**/*.js"],
      env: {
        node: true,
      },
    },
  ],
};
