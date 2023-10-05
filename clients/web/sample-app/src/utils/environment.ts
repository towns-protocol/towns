import { Chain, baseGoerli, foundry, sepolia } from 'wagmi/chains'

export enum TownsEnvironment {
    Prod = 'prod',
    TestBeta = 'test-beta',
    Local = 'local',
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
        id: TownsEnvironment.Prod,
        name: 'Prod',
        casablancaUrl: undefined,
        chainId: sepolia.id,
        chain: sepolia,
    },
    {
        id: TownsEnvironment.Local,
        name: 'Local',
        casablancaUrl: 'http://localhost:5157',
        chainId: foundry.id,
        chain: foundry,
    },
    {
        id: TownsEnvironment.TestBeta,
        name: 'Test Beta',
        casablancaUrl: 'https://river1-test.towns.com',
        chain: baseGoerli,
        chainId: baseGoerli.id,
    },
]
