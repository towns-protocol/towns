/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
module.exports = {
    arrowParens: 'always',
    endOfLine: 'lf',
    printWidth: 80,
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: 'all',

    overrides: [
        {
            files: ['*.js', '*.json', '*.ts', '*.tsx', '*.yml', '*.yaml'],
            options: {
                arrowParens: 'always',
                endOfLine: 'lf',
                printWidth: 100,
                semi: false,
                singleQuote: true,
                tabWidth: 4,
                trailingComma: 'all',
            },
        },
    ],
}
