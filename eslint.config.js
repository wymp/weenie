// NOTE: @typescript-eslint hasn't caught up to the new eslint config format yet, so we have to use compatibility tooling
const { FlatCompat } = require("@eslint/eslintrc");
const ESLintJS = require("@eslint/js");
const ESLintTSParser = require("@typescript-eslint/parser");
const ESLintTSPlugin = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

const compat = new FlatCompat({ resolvePluginsRelativeTo: __dirname });

module.exports = [
    // For all code
    ESLintJS.configs.recommended,
    ...compat.extends("plugin:@typescript-eslint/recommended"),
    {
        "linterOptions": {
            "reportUnusedDisableDirectives": "error"
        }
    },
    {
        "files": ["**/*.{ts,tsx}"],
        "languageOptions": {
            "parser": ESLintTSParser,
        },
    },

    // For all back-end code
    {
        "files": ["libs/*/{src,tests}/**", "apps/*/{src,tests}/**"],
        "languageOptions": {
            "ecmaVersion": 2022,
            "globals": {
                ...globals.commonjs,
            },
            "parserOptions": {
                "ecmaVersion": "latest",
                "sourceType": "module"
            },
        },
        "plugins": {
            "@typescript-eslint": ESLintTSPlugin,
        },
    },

    // For testing
    {
        "files": ["**/tests/**"],
        "rules": {
            "@typescript-eslint/no-explicit-any": "off",
        }
    },

    // A few random adjustments for everything
    {
        "rules": {
            // Typescript does this already
            "@typescript-eslint/no-unused-vars": "off",
        }
    },

    // All code will be prettified, so make sure this is at the end
    prettier,
]
