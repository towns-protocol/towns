import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: 'https://localhost:5158',
    },
    verbose: true,
    testTimeout: 60000,
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/jest-setup.ts'],
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
        // match "hash.js" but not whateverHash.js - viem has many of these which should not be
        '\\bhash\\.js\\b': 'hash.js',
        '(.+)\\.js': '$1',
    },
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
