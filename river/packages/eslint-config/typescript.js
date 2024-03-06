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
        'plugin:import/typescript',
        'prettier',
        'plugin:prettier/recommended',
    ],
    plugins: ['@typescript-eslint', 'import'],
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

                '@typescript-eslint/naming-convention': [
                    'error',
                    {
                        selector: 'interface',
                        format: ['PascalCase'],
                        prefix: ['I'],
                    },
                ],
            },
        },
    ],
    rules: {
        'no-console': 'error',
        'no-void': ['error', { allowAsStatement: true }],
        'no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: 'lodash',
                        message: 'Please use lodash submodules imports.',
                    },
                    {
                        name: 'lodash/fp',
                        message: 'Please use lodash submodules imports.',
                    },
                ],
            },
        ],
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
        'import/no-cycle': ['error', { ignoreExternal: true }],
        'import/no-useless-path-segments': 'error',
        'import/no-extraneous-dependencies': 'error',
        'import/no-default-export': 'error',
        'import/order': [
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
        'import/no-duplicates': 'error',
    },
}
