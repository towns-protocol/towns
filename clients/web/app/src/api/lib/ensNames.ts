import { isDefined } from '@river/sdk'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useLinkedWallets, useLinkedWalletsForWallet } from 'use-towns-client'
const publicClient = createPublicClient({ chain: mainnet, transport: http() })

export function useEnsNames() {
    const { data: linkedWallets, isLoading: isLoadingWallets } = useLinkedWallets()

    const queries = (linkedWallets ?? []).map((wallet) => {
        return {
            queryKey: ['linkedWalletsEnsNames', wallet],
            queryFn: async () => {
                const ensName = await publicClient.getEnsName({ address: wallet as `0x${string}` })
                return { ensName: ensName as string | undefined, wallet }
            },
            staleTime: 1000 * 3600,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        }
    })

    const ensResponses = useQueries({ queries: queries })
    const ensNames = ensResponses
        .map((r) => r.data)
        .filter(isDefined)
        .filter((r) => r.ensName && r.ensName.length > 0)

    const isLoadingEnsNames = ensResponses.some((response) => response.isLoading)
    return { ensNames: ensNames, isFetching: isLoadingWallets || isLoadingEnsNames }
}

export function useResolveEnsName({
    userId,
    ensAddress,
}: {
    userId: string | undefined
    ensAddress: string | undefined
}) {
    const { data: linkedWallets } = useLinkedWalletsForWallet({ walletAddress: userId })
    const linkedEnsWallet = linkedWallets?.find((x) => x === ensAddress)
    const { data: ensName, isLoading } = useQuery({
        queryKey: ['ensNames', linkedEnsWallet],
        queryFn: () => publicClient.getEnsName({ address: linkedEnsWallet as `0x${string}` }),
        enabled: !!linkedEnsWallet,
    })

    return { resolvedEnsName: ensName, isFetching: isLoading }
}
