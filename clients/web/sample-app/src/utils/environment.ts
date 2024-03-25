import { Chain, baseSepolia, foundry } from 'wagmi/chains'
import { IChainConfig } from 'use-towns-client'
import { StaticJsonRpcProvider } from '@ethersproject/providers'

const anvilRiverChain: IChainConfig = {
    chainId: 31338,
    name: 'anvil_river_chain',
    rpcUrl: 'http://127.0.0.1:8546',
    provider: new StaticJsonRpcProvider('http://127.0.0.1:8546'),
}

const riverChain: IChainConfig = {
    chainId: 6524490,
    name: 'river_chain',
    rpcUrl: 'https://devnet.rpc.river.build/',
    provider: new StaticJsonRpcProvider('https://devnet.rpc.river.build/'),
}

export enum TownsEnvironment {
    Prod = 'prod',
    Gamma = 'gamma',
    Local = 'local',
    Multinode = 'multinode',
}

export interface TownsEnvironmentInfo {
    id: TownsEnvironment
    name: string
    casablancaUrl: string | undefined
    chainId: number
    chain: Chain
    riverChain: IChainConfig
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = [
    {
        id: TownsEnvironment.Multinode,
        name: 'Multinode (local)',
        casablancaUrl: Array.from({ length: 10 }, (_, i) => `https://localhost:${5170 + i}`).join(
            ',',
        ),
        chainId: foundry.id,
        chain: foundry,
        riverChain: anvilRiverChain,
    },
    {
        id: TownsEnvironment.Local,
        name: 'Local',
        casablancaUrl: 'https://localhost:5157',
        chainId: foundry.id,
        chain: foundry,
        riverChain: anvilRiverChain,
    },
    {
        id: TownsEnvironment.Gamma,
        name: 'Gamma',
        casablancaUrl: 'https://river1.nodes.gamma.towns.com',
        chain: baseSepolia,
        chainId: baseSepolia.id,
        riverChain,
    },
]
