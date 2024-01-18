// NOTE: @typescript-eslint hasn't caught up to the new eslint config format yet, so we have to use compatibility tooling
const { FlatCompat } = require("@eslint/eslintrc");
const ESLintJS = require("@eslint/js");
const ESLintTSParser = require("@typescript-eslint/parser");
const reactRefresh = require("eslint-plugin-react-refresh");
const prettier = require("eslint-config-prettier");

const compat = new FlatCompat({ resolvePluginsRelativeTo: __dirname });

module.exports = [
    // For all code
    ESLintJS.configs.recommended,
    ...compat.extends("plugin:@typescript-eslint/recommended"),
    ...compat.extends('plugin:react-hooks/recommended'),
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
        "files": ["apps/*/{src,tests}/**","libs/*/{src,tests}/**"],
        "ignores": ["apps/my-react-app/**", "libs/shared-fe/**"],
        "env": {
            "browser": false,
            "node": true,
            "es2022": true
        },
        "parserOptions": {
            "ecmaVersion": "latest",
            "sourceType": "module"
        },
        "plugins": [
            "@typescript-eslint"
        ],
    },

    // For all front-end code
    {
        "files": ["apps/my-react-app/{src,tests}/**", "libs/shared-fe/{src,tests}/**"],
        "env": { "browser": true, "es2020": true },
        "plugins": {
            "react-refresh": reactRefresh,
        },
        "rules": {
            "react-refresh/only-export-components": [
                "warn",
                { "allowConstantExport": true },
            ],
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
