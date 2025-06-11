import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    include: ['src/web/**/*.test.ts'],
                    name: 'web',
                    environment: 'happy-dom',
                },
            },
            {
                test: {
                    include: ['src/node/**/*.test.ts'],
                    name: 'node',
                    environment: 'node',
                },
            },
        ],
    },
})
