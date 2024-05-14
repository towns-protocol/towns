import { useQuery } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'
import { blockchainKeys } from '../query/query-keys'

export function useSupportedXChainIds() {
    const client = useTownsClient()
    return useQuery(blockchainKeys.supportedXChainIds(), client.getSupportedXChainIds, {
        staleTime: Infinity,
    })
}
