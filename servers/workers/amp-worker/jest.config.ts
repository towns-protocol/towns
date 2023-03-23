export default {
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
            tsconfig: './test/tsconfig.json',
            useESM: true,
        },
    },
    transform: {
        '^.+\\.(t|j)sx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    resolver: `../common/resolver.js`,
    testRegex: '/test/.*\\.test\\.ts$',
    testEnvironment: 'miniflare',
    testEnvironmentOptions: {
        scriptPath: './src/index.ts',
        wranglerConfigEnv: 'dev',
        wranglerConfigPath: './wrangler.test.toml',
        modules: true,
    },
}
