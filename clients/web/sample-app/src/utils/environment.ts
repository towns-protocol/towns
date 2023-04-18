import { foundry, goerli, sepolia } from 'wagmi/chains'

export enum Environment {
    Prod = 'prod',
    Test = 'test',
    Local = 'local',
}

const ENVIRONS = {
    [Environment.Prod]: {
        casablancaUrl: undefined,
        matrixUrl: 'https://node1.towns.com',
        chain: sepolia,
    },
    [Environment.Test]: {
        casablancaUrl: undefined,
        matrixUrl: 'https://node1-test.towns.com',
        chain: goerli,
    },
    [Environment.Local]: {
        casablancaUrl: 'http://localhost:5157',
        matrixUrl: 'http://localhost:8008',
        chain: foundry,
    },
}

export function getEnvironment(env: Environment) {
    return ENVIRONS[env]
}

export function getChainIdForMatrixUrl(url: string) {
    const env = Object.values(ENVIRONS).find((e) => e.matrixUrl === url)
    return env?.chain.id ?? foundry.id
}
