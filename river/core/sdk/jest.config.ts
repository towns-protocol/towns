import path from 'path'
import os from 'os'
import { existsSync } from 'fs'

import type { JestConfigWithTsJest } from 'ts-jest'

const localRiverCA = path.join(os.homedir(), 'river-ca-cert.pem')

const findNodeModules = () => {
    // go up until we find node_modules
    let dir = __dirname
    while (!existsSync(path.join(dir, 'node_modules'))) {
        dir = path.dirname(dir)
    }
    return `${dir}/node_modules`
}

const NODE_MODULES_DIR = findNodeModules()

if (!existsSync(localRiverCA)) {
    console.log('CA does not exist, did you forget to run ../scripts/register-ca.sh')
}
process.env.NODE_EXTRA_CA_CERTS = localRiverCA

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: './../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
        url: 'http://localhost:80',
    },
    runner: 'groups',
    verbose: true,
    testTimeout: 120000,
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/', 'util.test.ts', 'setupUrl.test.ts'],
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
        // need for encryption
        '\\.(wasm)$': require.resolve('../encryption/src/mock-wasm-file.js'),
        msgpackr: `${NODE_MODULES_DIR}/msgpackr/dist/node.cjs`,
    },
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['json', 'html'],
}

export default config
