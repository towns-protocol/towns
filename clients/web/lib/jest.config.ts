import type { Config } from '@jest/types'
// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: { browsers: ['chrome', 'firefox', 'safari'] },
    moduleNameMapper: {
        '\\.(wasm\\?url)$': require.resolve('./tests/mocks/file-mock.js'),
    },
    runner: 'groups',
}
export default config
