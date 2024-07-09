import { isTestEnv } from '@river-build/sdk'
// eslint-disable-next-line no-restricted-imports
import {
    QueryClient,
    QueryFunction,
    QueryKey,
    UseQueryOptions,
    useMutation as useMutationBase,
    useQueryClient,
    useQuery as useBaseQuery,
    useQueries,
    QueryClientProvider,
    QueryClientConfig,
    UseQueryResult,
    DefaultError,
    UseMutationOptions,
    UseMutationResult,
} from '@tanstack/react-query'

const defaultStaleTime = 1_000 * 15
const staleTime24Hours = 1000 * 60 * 60 * 24

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
        staleTime: defaultStaleTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...(options ?? {}),
    })
}

function useMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
    options: UseMutationOptions<TData, TError, TVariables, TContext>,
    queryClient?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TContext> {
    return useMutationBase(options, queryClient)
}

// [re]exporting from here so other files can import from this file for all their needs
export {
    useQuery,
    queryClient,
    useMutation,
    useQueries,
    useQueryClient,
    QueryClientProvider,
    defaultStaleTime,
    staleTime24Hours,
}

export type { UseQueryResult }
