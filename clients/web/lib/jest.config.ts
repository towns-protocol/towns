import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts', '<rootDir>/jest.matchers.ts', 'dotenv/config'],
    testEnvironment: './jest.env.ts',
    testEnvironmentOptions: { browsers: ['chrome', 'firefox', 'safari'] },
    runner: 'groups',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        '\\.(wasm)$': require.resolve('./tests/mocks/file-mock.js'),
        //line below is required to address issues with bullmq
        msgpackr: '<rootDir>/../../../node_modules/msgpackr/dist/node.cjs',
    },
    setupFiles: ['fake-indexeddb/auto'],
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 100_000,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
