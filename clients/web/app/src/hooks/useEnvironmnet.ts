import { useCallback, useMemo, useRef, useState } from 'react'
import { Chain } from 'viem'
import { IChainConfig } from 'use-towns-client'
import {
    Address,
    BaseChainConfig,
    ContractVersion,
    RiverChainConfig,
    getWeb3Deployment,
    getWeb3Deployments,
} from '@river-build/web3'
import { check } from '@river-build/dlog'
import { isDefined } from '@river/sdk'
import { AccountAbstractionConfig } from '@towns/userops'
import { env } from 'utils'
import {
    getCustomBaseChain,
    getCustomRiverChain,
    makeBaseChain,
    makeRiverChain,
} from 'customChains'

const TOWNS_DEV_ENV = 'TOWNS_DEV_ENV'

export interface TownsEnvironmentInfo {
    id: string
    name: string
    baseChain: Chain
    baseChainConfig: BaseChainConfig
    riverChain: IChainConfig
    riverChainConfig: RiverChainConfig
    accountAbstractionConfig?: AccountAbstractionConfig
}

function makeEnvironments(): TownsEnvironmentInfo[] {
    const retVal: TownsEnvironmentInfo[] = []
    // first grab the config from the env, this will be the default if it exists
    if (env.VITE_RIVER_ENV) {
        // if we define VITE_RIVER_ENV, we should define all the other river env vars
        check(isDefined(env.VITE_BASE_CHAIN_RPC_URL), 'Missing VITE_BASE_CHAIN_RPC_URL')
        check(isDefined(env.VITE_BASE_CHAIN_ID), 'Missing VITE_BASE_CHAIN_ID')
        check(isDefined(env.VITE_RIVER_CHAIN_RPC_URL), 'Missing VITE_RIVER_CHAIN_RPC_URL')
        check(isDefined(env.VITE_RIVER_CHAIN_ID), 'Missing VITE_RIVER_CHAIN_ID')
        check(isDefined(env.VITE_ADDRESS_SPACE_FACTORY), 'Missing VITE_ADDRESS_SPACE_FACTORY')
        check(isDefined(env.VITE_ADDRESS_SPACE_OWNER), 'Missing VITE_ADDRESS_SPACE_OWNER')
        check(isDefined(env.VITE_ADDRESS_RIVER_REGISTRY), 'Missing VITE_ADDRESS_RIVER_REGISTRY')
        retVal.push({
            id: env.VITE_RIVER_ENV,
            name: env.VITE_RIVER_ENV,
            baseChain: makeBaseChain(
                parseInt(env.VITE_BASE_CHAIN_ID),
                env.VITE_BASE_CHAIN_RPC_URL,
                env.VITE_BASE_CHAIN_WS_URL,
            ),
            baseChainConfig: {
                chainId: parseInt(env.VITE_BASE_CHAIN_ID),
                contractVersion: (env.VITE_BASE_CONTRACT_VERSION ?? 'v3') as ContractVersion,
                addresses: {
                    spaceFactory: env.VITE_ADDRESS_SPACE_FACTORY as Address,
                    spaceOwner: env.VITE_ADDRESS_SPACE_OWNER as Address,
                    mockNFT: env.VITE_ADDRESS_MOCK_NFT as Address | undefined,
                    member: env.VITE_ADDRESS_MEMBER as Address | undefined,
                },
            },
            riverChain: makeRiverChain(
                parseInt(env.VITE_RIVER_CHAIN_ID),
                env.VITE_RIVER_CHAIN_RPC_URL,
            ),
            riverChainConfig: {
                chainId: parseInt(env.VITE_RIVER_CHAIN_ID),
                contractVersion: (env.VITE_RIVER_CONTRACT_VERSION ?? 'v3') as ContractVersion,
                addresses: {
                    riverRegistry: env.VITE_ADDRESS_RIVER_REGISTRY as Address,
                },
            },
            accountAbstractionConfig: env.VITE_AA_RPC_URL // currently aa_rpc_url is the same as the base chain rpc url
                ? {
                      aaRpcUrl: env.VITE_AA_RPC_URL,
                      bundlerUrl: env.VITE_AA_BUNDLER_URL,
                      paymasterProxyUrl: env.VITE_AA_PAYMASTER_PROXY_URL,
                      entryPointAddress: env.VITE_AA_ENTRY_POINT_ADDRESS,
                      factoryAddress: env.VITE_AA_FACTORY_ADDRESS,
                      paymasterProxyAuthSecret: env.VITE_AUTH_WORKER_HEADER_SECRET,
                      skipTransactionConfirmation: false,
                  }
                : undefined,
        } satisfies TownsEnvironmentInfo)
    }
    // add the debug environments
    for (const riverEnv of getWeb3Deployments()) {
        const deployment = getWeb3Deployment(riverEnv)
        // don't add the default env
        if (riverEnv === env.VITE_RIVER_ENV) {
            continue
        }
        // get the chains
        const baseChain = getCustomBaseChain(deployment.base.chainId)
        // don't add chain if we haven't predefined a custom base chain
        if (!baseChain) {
            continue
        }
        const riverChain = getCustomRiverChain(deployment.river.chainId)
        // don't add chain if we haven't predefined a custom river chain
        if (!riverChain) {
            continue
        }
        // account abstraction only works on gamma, add some tech debt to figure out
        // how to support it elsewhere
        const supportsAA = riverEnv === 'gamma'
        // add the env
        retVal.push({
            id: riverEnv,
            name: riverEnv,
            baseChain,
            baseChainConfig: deployment.base,
            riverChain,
            riverChainConfig: deployment.river,
            // account abstraction is a little tacked on, if the chain supports it, we add the config
            // it should probably be tied to the deployment/riverEnv value instead
            accountAbstractionConfig: supportsAA
                ? {
                      aaRpcUrl: baseChain.rpcUrls.default.http[0],
                      bundlerUrl: env.VITE_AA_BUNDLER_URL,
                      paymasterProxyUrl: env.VITE_AA_PAYMASTER_PROXY_URL,
                      entryPointAddress: env.VITE_AA_ENTRY_POINT_ADDRESS,
                      factoryAddress: env.VITE_AA_FACTORY_ADDRESS,
                      paymasterProxyAuthSecret: env.VITE_AUTH_WORKER_HEADER_SECRET,
                      skipTransactionConfirmation: false,
                  }
                : undefined,
        } satisfies TownsEnvironmentInfo)
    }
    return retVal
}

export const ENVIRONMENTS = makeEnvironments()
if (!ENVIRONMENTS.length) {
    throw new Error('No environments defined')
}
const defaultEnvironmentId = env.VITE_RIVER_ENV ?? env.VITE_RIVER_DEFAULT_ENV
const DEFAULT_ENVIRNOMENT =
    ENVIRONMENTS.find((x) => x.id === defaultEnvironmentId) ?? ENVIRONMENTS[0]

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>

export function useEnvironment() {
    const _environmentId = useRef<{ value: string | undefined } | undefined>()
    if (env.DEV && !_environmentId.current) {
        _environmentId.current = {
            value: localStorage.getItem(TOWNS_DEV_ENV) as string | undefined,
        }
    }

    const [environmentId, _setEnvironmentId] = useState<string | undefined>(
        _environmentId.current?.value,
    )

    const clearEnvironment = useCallback(() => {
        localStorage.removeItem('RIVER_RPC_URL')
        localStorage.removeItem(TOWNS_DEV_ENV)
        _setEnvironmentId(undefined)
    }, [])

    const setEnvironment = useCallback((newValue: string) => {
        _setEnvironmentId(newValue)
        localStorage.removeItem('RIVER_RPC_URL')
        localStorage.setItem(TOWNS_DEV_ENV, newValue)
        // after setEnvironment is called the page needs to be refreshed
    }, [])

    const environmentInfo = useMemo(
        () => ENVIRONMENTS.find((e) => e.id === environmentId) ?? DEFAULT_ENVIRNOMENT,
        [environmentId],
    )

    return useMemo(() => {
        return {
            ...environmentInfo,
            setEnvironment,
            clearEnvironment,
        }
    }, [environmentInfo, setEnvironment, clearEnvironment])
}
