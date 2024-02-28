import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../jest.env.ts',
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
        '(.+)\\.js': '$1',
    },
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
