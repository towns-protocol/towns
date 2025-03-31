import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
    test: {
        deps: {
            inline: ['ethers'],
        },
        exclude: ['node_modules', 'dist'],
        include: ['**/test/**.test.ts'],
        poolOptions: {
            workers: {
                wrangler: {
                    configPath: './wrangler.test.toml',
                    environment: 'test',
                },
            },
        },
    },
})
