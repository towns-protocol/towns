import { useCallback, useMemo, useState } from 'react'
import { Chain } from 'wagmi'
import { IChainConfig } from 'use-towns-client'
import { env } from 'utils'
import { anvilRiverChain, baseSepoliaClone, foundryClone, riverTestRiverChain } from 'customChains'

const TOWNS_DEV_ENV = 'TOWNS_DEV_ENV'

export enum SpaceProtocol {
    Casablanca = 'casablanca',
}

export enum TownsEnvironment {
    Prod = 'prod',
    Test = 'test',
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
    riverChain: IChainConfig
    protocol: SpaceProtocol
    aaRpcUrl: string | undefined
    aaBundlerUrl: string | undefined
    aaPaymasterProxyUrl: string | undefined
}

export const ENVIRONMENTS: TownsEnvironmentInfo[] = [
    {
        id: TownsEnvironment.LocalRiver,
        name: 'Local River',
        casablancaUrl: 'https://localhost:5157',
        chainId: 31337,
        chain: foundryClone,
        riverChain: anvilRiverChain,
        protocol: SpaceProtocol.Casablanca,
        aaRpcUrl: undefined,
        aaBundlerUrl: undefined,
        aaPaymasterProxyUrl: undefined,
    },
    {
        id: TownsEnvironment.RiverTest,
        name: 'River Test',
        casablancaUrl: 'https://river1.nodes.gamma.towns.com',
        chainId: 84532,
        chain: baseSepoliaClone,
        riverChain: riverTestRiverChain,
        protocol: SpaceProtocol.Casablanca,
        aaRpcUrl: env.VITE_PROVIDER_HTTP_URL,
        aaBundlerUrl: env.VITE_AA_BUNDLER_URL,
        aaPaymasterProxyUrl: env.VITE_AA_PAYMASTER_PROXY_URL,
    },
]

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>

const CF_TUNNEL_PREFIX = env.VITE_CF_TUNNEL_PREFIX
const CASABLANCA_URL = env.VITE_CASABLANCA_HOMESERVER_URL
const CHAIN_ID = parseInt(env.VITE_CHAIN_ID)
const CHAIN = ENVIRONMENTS.find((e) => e.chainId === CHAIN_ID)?.chain
const RIVER_CHAIN = ENVIRONMENTS.find((e) => e.chainId === CHAIN_ID)?.riverChain

// if you set VITE_CF_TUNNEL_PREFIX, you'll always be pointed to tunnel for river, and chain will always be foundry
export function useEnvironment() {
    if (!CHAIN || !RIVER_CHAIN) {
        throw new Error(`Invalid chain id: ${CHAIN_ID}`)
    }

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
        localStorage.removeItem('RIVER_RPC_URL')
        localStorage.removeItem(TOWNS_DEV_ENV)
        _setEnvironment(undefined)
    }, [])

    const setEnvironment = useCallback((newValue: TownsEnvironment) => {
        if (CF_TUNNEL_PREFIX) {
            return
        }
        _setEnvironment(newValue)
        localStorage.removeItem('RIVER_RPC_URL')
        localStorage.setItem(TOWNS_DEV_ENV, newValue)
    }, [])

    const environmentInfo = environment ? ENVIRONMENTS.find((e) => e.id === environment) : undefined
    const chain = environmentInfo?.chain ?? CHAIN
    const chainId = chain.id
    const chainName = chain.name
    const casablancaUrl = environmentInfo?.casablancaUrl ?? CASABLANCA_URL
    const protocol = environmentInfo?.protocol ?? SpaceProtocol.Casablanca
    const riverChain = environmentInfo?.riverChain ?? RIVER_CHAIN

    return useMemo(
        () => ({
            environment, // only defined if DEV
            chain,
            chainId,
            chainName,
            riverChain,
            casablancaUrl,
            protocol,
            setEnvironment,
            clearEnvironment,
        }),
        [
            environment,
            chain,
            chainId,
            chainName,
            riverChain,
            casablancaUrl,
            protocol,
            setEnvironment,
            clearEnvironment,
        ],
    )
}
