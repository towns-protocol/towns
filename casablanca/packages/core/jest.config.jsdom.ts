import config from './jest.config'
import type { JestConfigWithTsJest } from 'ts-jest'

const newConfig: JestConfigWithTsJest = {
    ...config,
    testEnvironment: './../../jest.env.ts',
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
    },
}

export default config
