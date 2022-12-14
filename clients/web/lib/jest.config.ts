import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
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
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 60000,
}

export default config
