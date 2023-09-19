import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts', '<rootDir>/jest.matchers.ts'],
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
        msgpackr: '<rootDir>/../../../node_modules/msgpackr/dist/node.cjs',
    },
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 60000,
}

export default config
