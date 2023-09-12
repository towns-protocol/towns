import path from 'path'
import os from 'os'
import { existsSync } from 'fs'

import type { JestConfigWithTsJest } from 'ts-jest'

const localRiverCA = path.join(os.homedir(), 'river-ca-cert.pem')

if (!existsSync(localRiverCA)) {
    console.log('CA does not exist, did you forget to run ../scripts/register-ca.sh')
}
process.env.NODE_EXTRA_CA_CERTS = localRiverCA

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: 'https://localhost:5158',
    },
    runner: 'groups',
    verbose: true,
    testTimeout: 60000,
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/', 'util.test.ts'],
    setupFilesAfterEnv: ['jest-extended/all', './../jest.matchers.ts'],
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
        // need for mecholm/olm
        '\\.(wasm)$': require.resolve('./src/crypto/mocks/mock-wasm-file.js'),
    },
    collectCoverage: true,
    coverageReporters: ['json', 'html'],
}

export default config
