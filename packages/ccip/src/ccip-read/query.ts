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
import { iExtendedResolverAbi } from '../generated'

// Common ENS resolver function selectors for logging
const RESOLVER_SELECTORS: Record<Hex, string> = {
    [toFunctionSelector('addr(bytes32)')]: 'addr(bytes32)',
    [toFunctionSelector('addr(bytes32,uint256)')]: 'addr(bytes32,uint256)',
    [toFunctionSelector('text(bytes32,string)')]: 'text(bytes32,string)',
    [toFunctionSelector('contenthash(bytes32)')]: 'contenthash(bytes32)',
    [toFunctionSelector('name(bytes32)')]: 'name(bytes32)',
    [toFunctionSelector('pubkey(bytes32)')]: 'pubkey(bytes32)',
}

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
