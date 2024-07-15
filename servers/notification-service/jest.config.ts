import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    testMatch: ['**/*.test.ts?(x)'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^@river-build/proto$': '<rootDir>/../../river/packages/proto/src/gen/protocol_pb.ts',
    },
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 60000,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
