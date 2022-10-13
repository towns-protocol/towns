module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
            experimentalObjectRestSpread: true,
        },
        allowImportExportEverywhere: true,
    },
    plugins: ['@typescript-eslint', 'import', 'react', 'jest'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'react-app',
        'plugin:prettier/recommended',
        'prettier',
    ],
    rules: {
        '@typescript-eslint/no-base-to-string': 'error',
        'import/no-named-as-default-member': 'off',
        'react/display-name': 'off',
        'react/jsx-boolean-value': ['warn', 'never'],
        'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'ignore' }],
        'react/jsx-wrap-multilines': 'error',
        'react/no-array-index-key': 'error',
        'react/no-multi-comp': 'off',
        'react/prop-types': 'off',
        'react/self-closing-comp': 'warn',

        'react/jsx-sort-props': [
            'warn',
            {
                shorthandFirst: true,
                callbacksLast: true,
                noSortAlphabetically: true,
            },
        ],
        'import/order': [
            'error',
            {
                groups: ['external', 'internal'],
            },
        ],
        'sort-imports': [
            'warn',
            {
                ignoreCase: false,
                ignoreDeclarationSort: true,
                ignoreMemberSort: false,
            },
        ],
    },
    overrides: [
        {
            files: ['src/*.mdx'],
            extends: ['plugin:mdx/recommended'],
            rules: {
                'prettier/prettier': 'off',
                'import/no-anonymous-default-export': 'off',
                'react/display-name': 'off',
                'react/jsx-no-undef': 'off',
                'no-undef': 'warn',
            },
            settings: {
                'mdx/code-blocks': true,
            },
        },
        {
            files: ['src/*.{md,mdx}'],
            extends: 'plugin:mdx/code-blocks',
            rules: {
                'prettier/prettier': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                'import/no-unresolved': 'off',
                'react/react-in-jsx-scope': 'off',
                'react/jsx-no-undef': 'off',
            },
        },
    ],
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx', '.d.ts'],
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: ['./tsconfig.json'],
            },
        },
        react: {
            version: 'detect',
        },
    },
    env: {
        es6: true,
        browser: true,
        node: true,
        jest: true,
    },
}
