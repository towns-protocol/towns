import type { Config } from '@jest/types'

const esModules = ['nanoid'].join('|')

// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
    testEnvironment: './jest.env.ts',
    testEnvironmentOptions: { browsers: ['chrome', 'firefox', 'safari'] },
    transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
    moduleNameMapper: {
        '\\.(wasm\\?url)$': require.resolve('./tests/mocks/file-mock.js'),
        '^nanoid(/(.*)|$)': 'nanoid$1',
    },
    runner: 'groups',
}
export default config
