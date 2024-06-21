import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
    {
        test: {
            name: '@river-build/react-sdk',
            environment: 'node',
            include: ['./packages/react/src/**/*.test.ts'],
            testTimeout: 10_000,
            // Later, we can use the `setupFiles` option to run a setup file before each test.
            // setupFiles: ['./packages/react/test/setup.ts'],
        },
    },
])
