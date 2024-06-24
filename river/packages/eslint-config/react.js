module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'import', 'react'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    rules: {
        curly: 'warn',
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
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
        'import/no-cycle': ['warn'],
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
}
