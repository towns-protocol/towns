import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../../../casablanca/jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: 'http://localhost:5158',
    },
    verbose: true,
    testTimeout: 60000,
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    setupFilesAfterEnv: ['jest-extended/all'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        'bn.js': 'bn.js',
        'hash.js': 'hash.js',
        '(.+)\\.js': '$1',
    },
    collectCoverage: true,
    coverageReporters: ['json', 'html'],
}

export default config
