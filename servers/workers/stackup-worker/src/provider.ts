import { ISpaceDapp, createSpaceDapp, getWeb3Deployment } from '@river-build/web3'
import { ethers } from 'ethers'
import { Environment } from 'worker-common'
import { Env } from './index'

const LOCALHOST_RPC_URL = 'http://127.0.0.1:8545'
const BASE_SEPOLIA_RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/'
const BASE_RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/'

const providerMap = new Map<Environment, string>([
    ['development', LOCALHOST_RPC_URL],
    ['test-beta', `${BASE_SEPOLIA_RPC_URL}`],
    ['omega', `${BASE_RPC_URL}`],
])

export const networkMap = new Map<Environment, string>([
    ['development', 'anvil'],
    ['test-beta', 'base_sepolia'],
    ['omega', 'base'],
])

export const riverEnvMap = new Map<Environment, string>([
    ['development', 'single'],
    ['test-beta', 'gamma'],
    ['omega', 'omega'],
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

export async function createSpaceDappForNetwork(env: Env): Promise<ISpaceDapp | undefined> {
    const riverEnv = riverEnvMap.get(env.ENVIRONMENT)
    if (!riverEnv) {
        console.error('riverEnv not found for environment')
        return undefined
    }
    const provider = createStaticProvider(env.ENVIRONMENT, env)
    await provider.ready
    const config = getWeb3Deployment(riverEnv)

    const spaceDapp = createSpaceDapp(provider, config.base)
    return spaceDapp
}
