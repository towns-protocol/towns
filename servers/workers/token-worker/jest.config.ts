export default {
    preset: 'ts-jest',
    transform: {
        '^.+\\.(t|j)sx?$': [
            'ts-jest',
            {
                tsconfig: './test/tsconfig.json',
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testRegex: '/test/.*\\.test\\.ts$',
    testEnvironment: 'miniflare',
    testEnvironmentOptions: {
        scriptPath: './src/index.ts',
        wranglerConfigEnv: 'dev',
        wranglerConfigPath: './wrangler.test.toml',
        modules: true,
    },
    extensionsToTreatAsEsm: ['.ts'],
    transformIgnorePatterns: ['/node_modules/(?!(uuid|@solana/web3.js|jayson)/)'],
}
