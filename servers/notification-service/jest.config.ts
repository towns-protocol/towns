import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 60000,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
