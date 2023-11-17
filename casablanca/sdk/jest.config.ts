import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: process.env.RIVER_TEST_URL || 'http://localhost:5158',
    },
    runner: 'groups',
    verbose: true,
    testTimeout: 120000,
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/', 'util.test.ts'],
    setupFilesAfterEnv: ['jest-extended/all', './../jest.matchers.ts'],
    setupFiles: ['fake-indexeddb/auto'],
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
        // need for mecholm/olm
        '\\.(wasm)$': require.resolve('./src/crypto/mocks/mock-wasm-file.js'),
    },
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
