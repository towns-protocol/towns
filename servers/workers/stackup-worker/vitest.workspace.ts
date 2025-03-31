import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
    defineWorkersConfig({
        test: {
            deps: {
                inline: ['ethers'],
            },
            exclude: ['node_modules', 'dist'],
            include: ['**/test/determineSmartAccount.test.ts'],
            poolOptions: {
                workers: {
                    wrangler: {
                        configPath: './wrangler.test.toml',
                        environment: 'test',
                    },
                },
            },
            name: 'smart-account',
        },
    }),
    defineWorkersConfig({
        test: {
            deps: {
                inline: ['ethers'],
            },
            exclude: ['node_modules', 'dist'],
            include: ['**/test/index.test.ts'],
            poolOptions: {
                workers: {
                    wrangler: {
                        configPath: './wrangler.test.toml',
                        environment: 'test',
                    },
                },
            },
            name: 'router',
        },
    }),
])
