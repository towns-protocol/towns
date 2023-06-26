import { QueryClient } from '@tanstack/react-query'
import { isTestEnv } from '../utils/zion-utils'

// queryClient is imported in non React contexts (where we would normally useQueryClient)
// test query client should be the same instance as the queryClient used in lib code, hence we export it here
let config

if (isTestEnv()) {
    config = {
        logger: {
            log: console.log,
            warn: console.warn,
            // don't log network errors in tests
            error: () => null,
        },
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    }
}

export const queryClient = new QueryClient(config)
