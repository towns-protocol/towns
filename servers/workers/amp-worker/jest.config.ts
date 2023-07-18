export default {
    preset: 'ts-jest/presets/default-esm',
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
    testEnvironment: 'miniflare',
    testEnvironmentOptions: {
        wranglerConfigEnv: 'dev',
        wranglerConfigPath: './wrangler.test.toml',
        // Miniflare doesn't yet support the `main` field in `wrangler.toml` so we
        // need to explicitly tell it where our built worker is. We also need to
        // explicitly mark it as an ES module.
        scriptPath: './test/index.test.ts',
        modules: true,
    },
}
