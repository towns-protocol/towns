import { Chain, foundry, goerli, sepolia } from 'wagmi/chains'

export enum TownsEnvironment {
    Prod = 'prod',
    Test = 'test',
    Local = 'local',
}

export interface TownsEnvironmentInfo {
    id: TownsEnvironment
    name: string
    matrixUrl: string
    casablancaUrl: string | undefined
    chainId: number
    chain: Chain
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = [
    {
        id: TownsEnvironment.Prod,
        name: 'Prod',
        casablancaUrl: undefined,
        matrixUrl: 'https://node1.towns.com',
        chainId: sepolia.id,
        chain: sepolia,
    },
    {
        id: TownsEnvironment.Test,
        name: 'Test',
        matrixUrl: 'https://node1-test.towns.com',
        casablancaUrl: undefined,
        chainId: goerli.id,
        chain: goerli,
    },
    {
        id: TownsEnvironment.Local,
        name: 'Local',
        casablancaUrl: 'https://localhost:5157',
        matrixUrl: 'http://localhost:8008',
        chainId: foundry.id,
        chain: foundry,
    },
]
