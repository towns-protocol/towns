import { defineWorkspace } from 'vitest/config'

const commonConfig = {
    restoreMocks: true,
    globals: true,
    setupFiles: ['./vitest.setup.ts', 'dotenv/config', '@vitest/web-worker'],
    testTimeout: 180_000,
    environment: 'jsdom',
    poolOptions: {
        threads: {
            // run single test at a time - alchemy rpc rate limits (test account), avoid multiple concurrent useroperations from same user (privy runs)
            singleThread: true,
        },
    },
}

export default defineWorkspace([
    {
        test: {
            include: ['**/test/**.test.ts'],
            // don't run limits tests by default
            exclude: ['**/test/userops.limits.test.ts'],
            name: 'main',
            ...commonConfig,
        },
    },
    {
        test: {
            include: ['**/test/userops.limits.test.ts'],
            name: 'limits',
            ...commonConfig,
        },
    },
    {
        test: {
            include: [
                '**/test/userops.joinSpace.test.ts',
                '**/test/userops.roles.test.ts',
                '**/test/userops.editMembership.test.ts',
            ],
            name: 'legacy',
            ...commonConfig,
        },
    },
])
