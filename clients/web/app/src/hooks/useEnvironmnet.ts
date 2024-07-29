import { useCallback, useMemo, useRef, useState } from 'react'
import { Chain } from 'viem'
import { IChainConfig } from 'use-towns-client'
import {
    BaseChainConfig,
    RiverChainConfig,
    getWeb3Deployment,
    getWeb3Deployments,
} from '@river-build/web3'
import { AccountAbstractionConfig } from '@towns/userops'
import { getAccessToken } from '@privy-io/react-auth'
import { env } from 'utils'
import { getCustomBaseChain, getCustomRiverChain } from 'customChains'

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
    const fetchAccessTokenFn = () => retryGetAccessToken(3)
    // add the web3 environments
    for (const riverEnv of getWeb3Deployments()) {
        const deployment = getWeb3Deployment(riverEnv)
        // don't add the default env
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
        const envInfo: TownsEnvironmentInfo = {
            id: riverEnv,
            name: riverEnv,
            baseChain,
            baseChainConfig: deployment.base,
            riverChain,
            riverChainConfig: deployment.river,
        }

        // Account abstraction works on gamma, omega, or alpha
        if (riverEnv === 'gamma' || riverEnv === 'omega' || riverEnv === 'alpha') {
            envInfo.accountAbstractionConfig = {
                aaRpcUrl: baseChain.rpcUrls.default.http[0],
                bundlerUrl: env.VITE_AA_BUNDLER_URL,
                paymasterProxyUrl: env.VITE_AA_PAYMASTER_PROXY_URL,
                entryPointAddress: env.VITE_AA_ENTRY_POINT_ADDRESS,
                factoryAddress: env.VITE_AA_FACTORY_ADDRESS,
                paymasterProxyAuthSecret: env.VITE_AUTH_WORKER_HEADER_SECRET,
                skipPromptUserOnPMRejectedOp: false,
                fetchAccessTokenFn,
            }
        }
        // Account abstraction only works on local nodes if running geth, not anvil
        else if (deployment.base.executionClient === 'geth_dev') {
            envInfo.accountAbstractionConfig = {
                aaRpcUrl: 'http://localhost:8545',
                bundlerUrl: 'http://localhost:43370',
                paymasterProxyUrl: 'http://localhost:8686',
                entryPointAddress: undefined, // uses default userop.js address
                factoryAddress: undefined, // uses default userop.js address
                paymasterProxyAuthSecret: env.VITE_AUTH_WORKER_HEADER_SECRET,
                skipPromptUserOnPMRejectedOp: false,
                fetchAccessTokenFn,
            }
        }

        retVal.push(envInfo)
    }
    return retVal
}

export const ENVIRONMENTS = makeEnvironments()
if (!ENVIRONMENTS.length) {
    throw new Error('No environments defined')
}
const DEFAULT_ENVIRONMENT =
    ENVIRONMENTS.find((x) => x.id === env.VITE_RIVER_DEFAULT_ENV) ?? ENVIRONMENTS[0]

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
        () => ENVIRONMENTS.find((e) => e.id === environmentId) ?? DEFAULT_ENVIRONMENT,
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

async function retryGetAccessToken(
    maxRetries: number,
    initialDelay: number = 1000,
    factor: number = 2,
): Promise<string | null> {
    let attempt = 0
    let delayTime = initialDelay

    while (attempt < maxRetries) {
        try {
            const result = await getAccessToken()
            if (result) {
                return result
            }
            throw new Error("getAccessToken didn't return a token")
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error
            }
            await new Promise((resolve) => setTimeout(resolve, delayTime))
            delayTime *= factor
            attempt++
        }
    }

    throw new Error(`Failed after ${maxRetries} retries`)
}
