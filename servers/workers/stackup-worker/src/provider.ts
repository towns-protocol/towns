import { ISpaceDapp, Versions, createSpaceDapp } from '@river/web3'
import { ethers } from 'ethers'
import { env } from 'process'
import { Environment } from 'worker-common'
import { Env } from './index'

const LOCALHOST_RPC_URL = 'http://127.0.0.1:8545'
const BASE_SEPOLIA_RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/'

const providerMap = new Map<string, string>([
    ['development', LOCALHOST_RPC_URL],
    ['test-beta', `${BASE_SEPOLIA_RPC_URL}`],
])

export const networkMap = new Map<string, string>([
    ['development', 'anvil'],
    ['test-beta', 'base_sepolia'],
])

export function createStaticProvider(
    environment: Environment,
    env: Env,
): ethers.providers.StaticJsonRpcProvider {
    let providerUrl = providerMap.get(environment)
    if (environment !== 'development') {
        providerUrl = `${providerUrl}${env.ALCHEMY_API_KEY}`
    }
    return new ethers.providers.StaticJsonRpcProvider({
        url: providerUrl ?? '',
        skipFetchSetup: true,
    })
}

export function createJsonProvider(
    environment: Environment,
    env: Env,
): ethers.providers.JsonRpcProvider {
    let providerUrl = providerMap.get(environment)
    if (environment !== 'development') {
        providerUrl = `${providerUrl}${env.ALCHEMY_API_KEY}`
    }
    return new ethers.providers.JsonRpcProvider({
        url: providerUrl ?? '',
        skipFetchSetup: true,
    })
}

export async function createSpaceDappForNetwork(
    env: Env,
): Promise<ISpaceDapp<Versions> | undefined> {
    const provider = createStaticProvider(env.ENVIRONMENT, env)
    const network = await provider.getNetwork()
    const spaceDapp = createSpaceDapp({
        chainId: network.chainId,
        provider,
    })
    return spaceDapp
}
