import { defineConfig, mergeConfig } from 'vitest/config'
import { rootConfig } from '../../vitest.config.mjs'

const config = defineConfig({
    test: {
        projects: [
            {
                test: {
                    include: ['src/tests/**/*.test.ts'],
                    name: 'web',
                    environment: 'happy-dom',
                    globals: true,
                    setupFiles: './vitest.setup.ts',
                },
            },
            {
                test: {
                    include: ['src/tests/**/*.test.ts'],
                    name: 'node',
                    environment: 'node',
                    globals: true,
                },
            },
        ],
    },
})

export default mergeConfig(rootConfig, config)
