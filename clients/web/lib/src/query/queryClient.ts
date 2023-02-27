import { QueryClient } from '@tanstack/react-query'

// queryClient is imported in non React contexts (where we would normally useQueryClient)
// test query client should be the same instance as the queryClient used in lib code, hence we export it here
let config

if (process.env.JEST_WORKER_ID) {
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
