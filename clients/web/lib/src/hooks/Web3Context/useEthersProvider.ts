import { useMemo } from 'react'
import { type PublicClient, usePublicClient, Chain } from 'wagmi'
import { providers } from 'ethers'
import { Transport, type HttpTransport } from 'viem'

type Network = {
    chainId: number
    name: Chain['name']
    ensAddress?: string
}

type PClient = PublicClient<Transport, Chain>

export function publicClientToProvider(publicClient: PClient) {
    const { chain, transport } = publicClient

    const network: Network = {
        chainId: chain.id,
        name: chain.name,
        // goerli is the only network w/ a registry address. But just ignoring TS for now in case sepolia gets one
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        ensAddress: chain.contracts?.ensRegistry?.address,
    }

    // TODO: this should go away once we're all moved over to Viem
    //
    // ethers FallbackProvider randomly chooses a provider to fulfill a request https://docs.ethers.org/v5/api/providers/other/#FallbackProvider
    // - though we can give a priority and weight to each provider, the public provider for sepolia is rpc.sepolia.org, which also throws CORS errors, so we get errors from ethers about quoroum
    // - so in non-local environments, we override the public provider so all providers are pointing to the same url - basically we just want to use alchemy if it's available.
    //
    // Also to note, viem doesn't support priority currently https://wagmi.sh/core/migration-guide#removed-quorum-support
    // So we should probably just pass a single provider instead of alchemy + publicProvider when configuring chains, but that will require filtering out chains per environment
    // https://linear.app/hnt-labs/issue/HNT-2293/filter-chains-per-env
    if (transport.type === 'fallback') {
        const privateUrl = (transport.transports as ReturnType<HttpTransport>[]).find(
            ({ value }) => value?.url?.includes('alchemy') || value?.url?.includes('infura'),
        )
        return new providers.FallbackProvider(
            (transport.transports as ReturnType<HttpTransport>[]).map(({ value }) => {
                return new providers.StaticJsonRpcProvider(
                    privateUrl ? privateUrl.value?.url : value?.url,
                    network,
                )
            }),
        )
    }

    return new providers.StaticJsonRpcProvider(transport.url as string, network)
}

/** Hook to convert a viem Public Client to an ethers.js Provider. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
    const publicClient = usePublicClient<PClient>({ chainId })
    return useMemo(() => publicClientToProvider(publicClient), [publicClient])
}
