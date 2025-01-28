import {
    GetBlockReturnType,
    Chain,
    PublicClient,
    HttpTransport,
    createPublicClient,
    http,
} from 'viem'
import { base } from 'viem/chains'
import { config } from './environment'

export const baseChainWithCustomRpcUrl: Chain = {
    ...base,
    rpcUrls: {
        default: {
            http: [config.baseProviderUrl],
        },
    },
}

export type BlockType = GetBlockReturnType<typeof baseChainWithCustomRpcUrl, true, 'latest'>
export type PublicClientType = PublicClient<
    HttpTransport,
    typeof baseChainWithCustomRpcUrl,
    any,
    any
>

export function createCustomPublicClient(): PublicClientType {
    return createPublicClient({
        chain: baseChainWithCustomRpcUrl,
        transport: http(),
    })
}
