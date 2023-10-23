import { useCallback, useMemo, useState } from 'react'
import { Chain } from 'wagmi'
import { baseGoerli } from 'wagmi/chains'
import { getChainName } from 'use-zion-client'
import { foundryClone } from 'AppWagmiConfig'
import { env } from 'utils'

const TOWNS_DEV_ENV = 'TOWNS_DEV_ENV'

export enum SpaceProtocol {
    Casablanca = 'casablanca',
}

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
    casablancaUrl: string | undefined
    chainId: number
    chain: Chain
    protocol: SpaceProtocol
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = [
    {
        id: TownsEnvironment.LocalRiver,
        name: 'Local River',
        casablancaUrl: 'http://localhost:5157',
        chainId: 31337,
        chain: foundryClone,
        protocol: SpaceProtocol.Casablanca,
    },
    {
        id: TownsEnvironment.RiverTest,
        name: 'River Test',
        casablancaUrl: 'https://river1-test.towns.com',
        chainId: 84531,
        chain: baseGoerli,
        protocol: SpaceProtocol.Casablanca,
    },
]

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>

const CF_TUNNEL_PREFIX = env.VITE_CF_TUNNEL_PREFIX
const CASABLANCA_URL = env.VITE_CASABLANCA_HOMESERVER_URL
const CHAIN_ID = parseInt(env.VITE_CHAIN_ID)

// if you set VITE_CF_TUNNEL_PREFIX, you'll always be pointed to tunnel for matrix, and chain will always be foundry
export function useEnvironment() {
    let _environment: TownsEnvironment | undefined

    if (env.DEV) {
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
    const casablancaUrl = environmentInfo?.casablancaUrl ?? CASABLANCA_URL
    const protocol = environmentInfo?.protocol ?? SpaceProtocol.Casablanca

    return useMemo(
        () => ({
            environment, // only defined if DEV
            chainId,
            chainName,
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
            setEnvironment,
        ],
    )
}
