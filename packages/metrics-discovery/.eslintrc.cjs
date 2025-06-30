const path = require('path')

module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:import-x/recommended',
        'plugin:import-x/typescript',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: { project: [path.join(__dirname, './tsconfig.json')] },
    plugins: ['@typescript-eslint', 'import-x'],
    ignorePatterns: ['dist/**', '.turbo/**', 'node_modules/**'],
    rules: {
        'require-await': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                caughtErrors: 'none',
            },
        ],
        '@typescript-eslint/restrict-template-expressions': [
            'error',
            {
                allowNever: true,
                allowBoolean: true,
                allowNumber: true,
                allowAny: true,
                allowNullish: true,
            },
        ],
        '@typescript-eslint/no-empty-function': [
            'error',
            {
                allow: ['arrowFunctions'],
            },
        ],

        '@typescript-eslint/ban-ts-comment': 'off',
    },
    overrides: [
        {
            files: ['**/*.test.*', '**/*.test_util.*'],
            rules: {
                '@typescript-eslint/no-unsafe-call': 'error',
                '@typescript-eslint/no-non-null-assertion': 'error',
                '@typescript-eslint/no-unsafe-argument': 'error',
            },
        },
    ],
}
