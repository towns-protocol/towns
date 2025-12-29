import { alchemy } from 'evm-providers'
import { type Hex, createPublicClient, http, slice, toFunctionSelector } from 'viem'
import {
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    celo,
    celoSepolia,
    linea,
    lineaSepolia,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    scroll,
    scrollSepolia,
    worldchain,
    worldchainSepolia,
} from 'viem/chains'

import { type Env, envVar } from '../env'
import { dnsDecodeName } from './utils'
import { iExtendedResolverAbi } from '../abi'

const supportedChains = [
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    celo,
    celoSepolia,
    linea,
    lineaSepolia,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    scroll,
    scrollSepolia,
    worldchain,
    worldchainSepolia,
]

type HandleQueryArgs = {
    dnsEncodedName: Hex
    encodedResolveCall: Hex
    targetChainId: bigint
    targetRegistryAddress: Hex
    env: Env
}

export async function handleQuery({
    dnsEncodedName,
    encodedResolveCall,
    targetChainId,
    targetRegistryAddress,
    env,
}: HandleQueryArgs) {
    const name = dnsDecodeName(dnsEncodedName)

    const chain = supportedChains.find((chain) => BigInt(chain.id) === targetChainId)

    if (!chain) {
        console.error(`Unsupported chain ${targetChainId} for ${name}`)
        return '0x' as const
    }

    const l2Client = createPublicClient({
        chain,
        transport: http(alchemy(chain.id, envVar('ALCHEMY_API_KEY', env))),
    })

    return l2Client.readContract({
        address: targetRegistryAddress,
        abi: iExtendedResolverAbi,
        functionName: 'resolve',
        args: [dnsEncodedName, encodedResolveCall],
    })
}
