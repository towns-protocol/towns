import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
    preset: 'ts-jest',

    verbose: true,
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts?(x)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'babel-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    testTimeout: 60000,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
