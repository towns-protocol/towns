import { useMemo } from 'react'
import { type PublicClient, usePublicClient } from 'wagmi'
import { providers } from 'ethers'
import { Transport, type HttpTransport } from 'viem'
import { SupportedChains } from '../../components/Web3ContextProvider'

type Network = {
    chainId: number
    name: SupportedChains['name']
    ensAddress?: string
}

type PClient = PublicClient<Transport, SupportedChains>

const alchemyRpcUrls = (
    alchemyKey: string,
): {
    [key: number]: {
        https: string
        wss: string
    }
} => ({
    5: {
        https: `https://eth-goerli.g.alchemy.com/v2/${alchemyKey}`,
        wss: `wss://eth-goerli.g.alchemy.com/v2/${alchemyKey}`,
    },
    11155111: {
        https: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
        wss: `wss://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    },
})

// ethers v5 has an AlchemyProvider, but it doesn't support sepolia, so we have to use the StaticJsonRpcProvider with Alchemy's urls
// StaticJsonRpcProvider wont call chainId for every request, which is OK because the chainId each environment is static. For now at least
function newEthersProvider(url: string | undefined, network: Network, alchemyKey?: string) {
    const id = network.chainId

    if (!url || id === 1337 || id === 31337 || !alchemyKey) {
        return new providers.StaticJsonRpcProvider(url, network)
    }

    const alchemyUrls = alchemyRpcUrls(alchemyKey ?? '')
    const rpcUrl = url.includes('wss') ? alchemyUrls[id].wss : alchemyUrls[id].https

    return new providers.StaticJsonRpcProvider(rpcUrl, network)
}

export function publicClientToProvider(publicClient: PClient, alchemyKey?: string) {
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
    if (transport.type === 'fallback') {
        return new providers.FallbackProvider(
            (transport.transports as ReturnType<HttpTransport>[]).map(({ value }) =>
                newEthersProvider(value?.url, network, alchemyKey),
            ),
        )
    }

    return newEthersProvider(transport.url as string, network)
}

/** Hook to convert a viem Public Client to an ethers.js Provider. */
export function useEthersProvider({
    chainId,
    alchemyKey,
}: { chainId?: number; alchemyKey?: string } = {}) {
    const publicClient = usePublicClient<PClient>({ chainId })
    return useMemo(
        () => publicClientToProvider(publicClient, alchemyKey),
        [alchemyKey, publicClient],
    )
}
