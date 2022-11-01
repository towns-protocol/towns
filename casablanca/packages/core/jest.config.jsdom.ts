import type { Config } from '@jest/types'

const esModules = ['nanoid'].join('|')

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testEnvironmentOptions: { browsers: ['chrome', 'firefox', 'safari'] },
    verbose: true,
    modulePathIgnorePatterns: ['/dist/'],
    transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
    moduleNameMapper: {
        '^nanoid(/(.*)|$)': 'nanoid$1',
    },
}

export default config
