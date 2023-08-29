import { useCallback, useMemo, useState } from 'react'
import { Chain } from 'wagmi'
import { foundry, goerli, sepolia } from 'wagmi/chains'
import { getChainName } from 'use-zion-client'
import { env } from 'utils'

const TOWNS_DEV_ENV = 'TOWNS_DEV_ENV'

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
        id: TownsEnvironment.Local,
        name: 'Local',
        matrixUrl: 'http://localhost:8008',
        casablancaUrl: 'http://localhost:5157',
        chainId: 31337,
        chain: foundry,
    },
    {
        id: TownsEnvironment.Test,
        name: 'Test',
        matrixUrl: 'https://node1-test.towns.com',
        casablancaUrl: undefined,
        chainId: 5,
        chain: goerli,
    },
    {
        id: TownsEnvironment.Prod,
        name: 'Prod',
        matrixUrl: 'https://node1.towns.com',
        casablancaUrl: undefined,
        chainId: 11155111,
        chain: sepolia,
    },
]

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>

export function useEnvironment() {
    const MATRIX_URL = env.VITE_MATRIX_HOMESERVER_URL
    const CASABLANCA_URL = env.VITE_CASABLANCA_HOMESERVER_URL
    const CHAIN_ID = parseInt(env.VITE_CHAIN_ID)

    let _environment: TownsEnvironment | undefined

    if (env.IS_DEV) {
        _environment = localStorage.getItem(TOWNS_DEV_ENV) as TownsEnvironment
    }

    const [environment, _setEnvironment] = useState<TownsEnvironment | undefined>(_environment)

    const clearEnvironment = useCallback(() => {
        localStorage.removeItem(TOWNS_DEV_ENV)
        _setEnvironment(undefined)
    }, [])

    const setEnvironment = useCallback((newValue: TownsEnvironment) => {
        _setEnvironment(newValue)
        localStorage.setItem(TOWNS_DEV_ENV, newValue)
    }, [])

    const environmentInfo = environment ? ENVIRONMENTS.find((e) => e.id === environment) : undefined
    const chainId = environmentInfo?.chainId ?? CHAIN_ID
    const chainName = environmentInfo?.chain.name ?? getChainName(chainId)
    const matrixUrl = environmentInfo?.matrixUrl ?? MATRIX_URL
    const casablancaUrl = environmentInfo?.casablancaUrl ?? CASABLANCA_URL
    const smartContractVersion = 'v3' //env.VITE_SMART_CONTRACT_VERSION

    return useMemo(
        () => ({
            environment, // only defined if IS_DEV
            chainId,
            chainName,
            matrixUrl,
            casablancaUrl,
            smartContractVersion,
            setEnvironment,
            clearEnvironment,
        }),
        [
            casablancaUrl,
            chainId,
            chainName,
            clearEnvironment,
            environment,
            matrixUrl,
            setEnvironment,
            smartContractVersion,
        ],
    )
}
