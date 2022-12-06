import type { Config } from '@jest/types'

const esModules = ['nanoid'].join('|')

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: './../../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: 'http://localhost:7104',
    },
    verbose: true,
    modulePathIgnorePatterns: ['/dist/'],
    transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
    moduleNameMapper: {
        '^nanoid(/(.*)|$)': 'nanoid$1',
    },
    testPathIgnorePatterns: ['/dist/', '/node_modules/', 'util.test.ts'],
    setupFilesAfterEnv: ['jest-extended/all'],
    runner: 'groups',
    testTimeout: 60000,
}

export default config
