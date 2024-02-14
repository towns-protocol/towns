import { Chain, baseSepolia, foundry } from 'wagmi/chains'

export enum TownsEnvironment {
    Prod = 'prod',
    TestBeta = 'test-beta',
    Local = 'local',
    Multinode = 'multinode',
}

export interface TownsEnvironmentInfo {
    id: TownsEnvironment
    name: string
    casablancaUrl: string | undefined
    chainId: number
    chain: Chain
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
    },
    {
        id: TownsEnvironment.Local,
        name: 'Local',
        casablancaUrl: 'https://localhost:5157',
        chainId: foundry.id,
        chain: foundry,
    },
    {
        id: TownsEnvironment.TestBeta,
        name: 'Test Beta',
        casablancaUrl: 'https://river1-test-beta.towns.com',
        chain: baseSepolia,
        chainId: baseSepolia.id,
    },
]
