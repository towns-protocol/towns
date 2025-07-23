module.exports = {
    /**
     *  Note: `parser` and `parserOptions` should be always provided on the package level given the way eslint resolves parser options paths
     *  parser: '@typescript-eslint/parser',
     *  parserOptions: {
     *    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
     *    sourceType: 'module', // Allows for the use of imports
     *    project: './tsconfig.json',
     *    tsconfigRootDir: './',
     *  },
     */
    env: {
        es6: true,
        commonjs: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import-x/typescript',
        'plugin:prettier/recommended',
    ],
    plugins: ['@typescript-eslint', 'import-x'],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint/eslint-plugin'],
            rules: {
                // Overwrites ts rules that conflicts with basic eslint rules

                /**
                 * `no-shadow` doesn't support Typescript enums
                 * see https://github.com/typescript-eslint/typescript-eslint/issues/2483
                 */
                'no-shadow': 'off',
                '@typescript-eslint/no-shadow': 'error',

                'no-unused-vars': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                        argsIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                    },
                ],
            },
        },
    ],
    rules: {
        'no-console': 'error',
        'no-void': ['error', { allowAsStatement: true }],
        'no-constant-condition': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-misused-promises': [
            'error',
            {
                checksVoidReturn: false,
            },
        ],

        /**
         * Import eslint rules
         */
        'import-x/no-cycle': ['error', { ignoreExternal: true }],
        'import-x/no-useless-path-segments': 'error',
        'import-x/no-extraneous-dependencies': 'error',
        'import-x/order': [
            'error',
            {
                groups: [
                    'builtin',
                    'external',
                    'unknown',
                    ['internal', 'parent', 'sibling', 'index'],
                ],
                pathGroups: [
                    {
                        pattern: '$**',
                        group: 'unknown',
                        position: 'after',
                    },
                ],
                'newlines-between': 'always',
            },
        ],
        'import-x/no-rename-default': 'off',
        'import-x/no-duplicates': 'error',
    },
}
