import { isTestEnv } from '@river/sdk'
// eslint-disable-next-line no-restricted-imports
import {
    QueryClient,
    QueryFunction,
    QueryKey,
    UseQueryOptions,
    useQueryClient,
    useQuery as useBaseQuery,
    useQueries,
    QueryClientProvider,
    QueryClientConfig,
    UseQueryResult,
} from '@tanstack/react-query'

// queryClient is imported in non React contexts (where we would normally useQueryClient)
// test query client should be the same instance as the queryClient used in lib code, hence we export it here
let config: QueryClientConfig | undefined

if (isTestEnv()) {
    config = {
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    }
}

const queryClient = new QueryClient(config)

// wrapping useQuery to set default options
// why not just set default options in the queryClient? Mostly to avoid potential confusion.
// lib uses react query for fetching blockchain data. the below is a good default for that use case.
// Consumers that use lib might use react-query too, but might not have the same use case.
// If the consumer doesn't wrap their own code in a separate queryClient, they will inherit the lib's queryClient and its default options.
// So lib code can use this hook instead, to set the default options for its own use cases.
function useQuery<
    TQueryFnData = unknown,
    TQueryKey extends QueryKey = QueryKey,
    TError = unknown,
    TData = TQueryFnData,
>(
    key: TQueryKey,
    queryFn: QueryFunction<TQueryFnData, TQueryKey>,
    options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>,
) {
    return useBaseQuery({
        queryKey: key,
        queryFn,
        staleTime: 1_000 * 15,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...(options ?? {}),
    })
}

// [re]exporting from here so other files can import from this file for all their needs
export { useQuery, queryClient, useQueries, useQueryClient, QueryClientProvider }

export type { UseQueryResult }
