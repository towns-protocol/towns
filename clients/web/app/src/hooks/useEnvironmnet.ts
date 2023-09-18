import { useCallback, useMemo, useState } from 'react'
import { Chain } from 'wagmi'
import { goerli, sepolia } from 'wagmi/chains'
import { SpaceProtocol, getChainName } from 'use-zion-client'
import { foundryClone } from 'wagmiConfig'
import { env } from 'utils'

const TOWNS_DEV_ENV = 'TOWNS_DEV_ENV'

export enum TownsEnvironment {
    Prod = 'prod',
    Test = 'test',
    LocalMatrix = 'local-matrix',
    LocalRiver = 'local-river',
    Tunnel = 'tunnel',
    RiverTest = 'river-test',
}

export interface TownsEnvironmentInfo {
    id: TownsEnvironment
    name: string
    matrixUrl: string | undefined
    casablancaUrl: string | undefined
    chainId: number
    chain: Chain
    protocol: SpaceProtocol
}

const commonLocalConfig = {
    matrixUrl: 'http://localhost:8008',
    casablancaUrl: 'http://localhost:5157',
    chainId: 31337,
    chain: foundryClone,
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = [
    {
        ...commonLocalConfig,
        id: TownsEnvironment.LocalMatrix,
        name: 'Local Matrix',
        protocol: SpaceProtocol.Matrix,
    },
    {
        ...commonLocalConfig,
        id: TownsEnvironment.LocalRiver,
        name: 'Local River',
        protocol: SpaceProtocol.Casablanca,
    },
    {
        id: TownsEnvironment.Test,
        name: 'Test',
        matrixUrl: 'https://node1-test.towns.com',
        casablancaUrl: undefined,
        chainId: 5,
        chain: goerli,
        protocol: SpaceProtocol.Matrix,
    },
    {
        id: TownsEnvironment.Prod,
        name: 'Prod',
        matrixUrl: 'https://node1.towns.com',
        casablancaUrl: undefined,
        chainId: 11155111,
        chain: sepolia,
        protocol: SpaceProtocol.Matrix,
    },
    // applicable only if VITE_CF_TUNNEL_PREFIX is set
    {
        id: TownsEnvironment.Tunnel,
        name: 'Tunnel (Matrix Only)',
        matrixUrl: `https://${env.VITE_CF_TUNNEL_PREFIX}-dendrite.towns.com`,
        casablancaUrl: undefined,
        chainId: 31337,
        chain: foundryClone,
        protocol: SpaceProtocol.Matrix,
    },
    {
        id: TownsEnvironment.RiverTest,
        name: 'River Test',
        matrixUrl: undefined,
        casablancaUrl: 'https://river1-test.towns.com',
        chainId: 5,
        chain: goerli,
        protocol: SpaceProtocol.Casablanca,
    },
]

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>

const CF_TUNNEL_PREFIX = env.VITE_CF_TUNNEL_PREFIX
const MATRIX_URL = env.VITE_MATRIX_HOMESERVER_URL
const CASABLANCA_URL = env.VITE_CASABLANCA_HOMESERVER_URL
const CHAIN_ID = parseInt(env.VITE_CHAIN_ID)
const PRIMARY_PROTOCOL = env.VITE_PRIMARY_PROTOCOL as SpaceProtocol

// if you set VITE_CF_TUNNEL_PREFIX, you'll always be pointed to tunnel for matrix, and chain will always be foundry
export function useEnvironment() {
    let _environment: TownsEnvironment | undefined

    if (env.IS_DEV) {
        _environment = CF_TUNNEL_PREFIX
            ? TownsEnvironment.Tunnel
            : (localStorage.getItem(TOWNS_DEV_ENV) as TownsEnvironment)
    }

    const [environment, _setEnvironment] = useState<TownsEnvironment | undefined>(_environment)

    const clearEnvironment = useCallback(() => {
        if (CF_TUNNEL_PREFIX) {
            return
        }
        localStorage.removeItem(TOWNS_DEV_ENV)
        _setEnvironment(undefined)
    }, [])

    const setEnvironment = useCallback((newValue: TownsEnvironment) => {
        if (CF_TUNNEL_PREFIX) {
            return
        }
        _setEnvironment(newValue)
        localStorage.setItem(TOWNS_DEV_ENV, newValue)
    }, [])

    const environmentInfo = environment ? ENVIRONMENTS.find((e) => e.id === environment) : undefined
    const chainId = environmentInfo?.chainId ?? CHAIN_ID
    const chainName = environmentInfo?.chain.name ?? getChainName(chainId)
    const matrixUrl = environmentInfo?.matrixUrl ?? MATRIX_URL
    const casablancaUrl = environmentInfo?.casablancaUrl ?? CASABLANCA_URL
    const protocol = environmentInfo?.protocol ?? PRIMARY_PROTOCOL

    return useMemo(
        () => ({
            environment, // only defined if IS_DEV
            chainId,
            chainName,
            matrixUrl,
            casablancaUrl,
            protocol,
            setEnvironment,
            clearEnvironment,
        }),
        [
            casablancaUrl,
            chainId,
            chainName,
            clearEnvironment,
            protocol,
            environment,
            matrixUrl,
            setEnvironment,
        ],
    )
}
