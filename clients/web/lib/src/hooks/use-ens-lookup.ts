import { useQueryClient } from '../query/queryClient'
import { useCallback, useState } from 'react'
import { Address, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { TownsOpts } from 'client/TownsClientTypes'
import { TownsClient } from 'client/TownsClient'

export type EnsInfo = { ensAddress: string; ensName: string }
const queryKey = (ensAddress: string) => ['ensName', ensAddress]

export const useSpaceEnsLookup = ({
    ethMainnetRpcUrl,
    townsClient,
}: {
    ethMainnetRpcUrl: TownsOpts['ethMainnetRpcUrl']
    townsClient?: TownsClient
}) => {
    const qc = useQueryClient()
    const [publicClient] = useState(() =>
        createPublicClient({
            chain: mainnet,
            transport: ethMainnetRpcUrl ? http(ethMainnetRpcUrl) : http(),
        }),
    )
    const getEnsData: (
        userId: string,
        ensAddress: string | undefined,
        fetchOnCacheMiss?: boolean,
    ) => Promise<EnsInfo | undefined> = useCallback(
        async (userId: string, ensAddress: string | undefined, fetchOnCacheMiss = true) => {
            if (!ensAddress) {
                return
            }
            const ensName = qc.getQueryData(queryKey(ensAddress))
            if (!ensName) {
                if (!fetchOnCacheMiss) {
                    return
                }
                const response = await publicClient.getEnsName({
                    address: ensAddress as Address,
                })
                if (response) {
                    qc.setQueryData(queryKey(ensAddress), response)
                    return { ensAddress, ensName: response }
                }
            }
            const _ensName = ensName as string
            const linkedWallets = await townsClient?.getLinkedWallets(userId)
            const isOwned = linkedWallets?.includes(ensAddress)

            return isOwned
                ? {
                      ensAddress,
                      ensName: _ensName,
                  }
                : undefined
        },
        [publicClient, qc, townsClient],
    )

    return { getEnsData }
}
