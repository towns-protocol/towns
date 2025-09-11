import type { SyncAgentConfig } from '@towns-protocol/sdk'
import { useCallback, useMemo, useState } from 'react'
import type { ethers } from 'ethers'
import { connectTownsWithBearerToken, signAndConnect } from './connectTowns'
import { useTownsSync } from './internals/useTownsSync'

type AgentConnectConfig = Omit<SyncAgentConfig, 'context' | 'onTokenExpired'>

/**
 * Hook for managing the connection to the sync agent
 *
 * @example You can connect the Sync Agent to Towns Protocol using a Bearer Token or using a Signer.
 *
 * ### Bearer Token
 * ```tsx
 * import { useAgentConnection } from '@towns-protocol/react-sdk'
 * import { makeRiverConfig } from '@towns-protocol/sdk'
 * import { useState } from 'react'
 *
 * const riverConfig = makeRiverConfig('gamma')
 *
 * const Login = () => {
 *   const { connectUsingBearerToken, isAgentConnecting, isAgentConnected } = useAgentConnection()
 *   const [bearerToken, setBearerToken] = useState('')
 *
 *   return (
 *     <>
 *       <input value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} />
 *       <button onClick={() => connectUsingBearerToken(bearerToken, { riverConfig })}>
 *         Login
 *       </button>
 *       {isAgentConnecting && <span>Connecting... ⏳</span>}
 *       {isAgentConnected && <span>Connected ✅</span>}
 *     </>
 *   )
 * }
 * ```
 *
 * ### Signer
 *
 * If you're using Wagmi and Viem, you can use the [`useEthersSigner`](https://wagmi.sh/react/guides/ethers#usage-1) hook to get an ethers.js v5 Signer from a Viem Wallet Client.
 *
 * ```tsx
 * import { useAgentConnection } from '@towns-protocol/react-sdk'
 * import { makeRiverConfig } from '@towns-protocol/sdk'
 * import { useEthersSigner } from './utils/viem-to-ethers'
 *
 * const riverConfig = makeRiverConfig('gamma')
 *
 * const Login = () => {
 *   const { connect, isAgentConnecting, isAgentConnected } = useAgentConnection()
 *   const signer = useEthersSigner()
 *
 *   return (
 *     <>
 *       <button onClick={async () => {
 *         if (!signer) {
 *           return
 *         }
 *         connect(signer, { riverConfig })
 *       }}>
 *         Login
 *       </button>
 *       {isAgentConnecting && <span>Connecting... ⏳</span>}
 *       {isAgentConnected && <span>Connected ✅</span>}
 *     </>
 *   )
 * }
 * ```
 *
 * @returns The connection state and methods (connect, connectUsingBearerToken, disconnect)
 */
export const useAgentConnection = () => {
    const [isAgentConnecting, setConnecting] = useState(false)
    const towns = useTownsSync()

    const connect = useCallback(
        async (signer: ethers.Signer, config: AgentConnectConfig) => {
            if (towns?.syncAgent) {
                return
            }
            const mergedConfig = {
                ...config,
                ...towns?.config,
                onTokenExpired: () => {
                    towns?.config?.onTokenExpired?.()
                    towns?.setSyncAgent(undefined)
                },
            }
            setConnecting(true)
            return signAndConnect(signer, mergedConfig)
                .then((syncAgent) => {
                    towns?.setSyncAgent(syncAgent)
                    return syncAgent
                })
                .finally(() => setConnecting(false))
        },
        [towns],
    )

    const connectUsingBearerToken = useCallback(
        async (bearerToken: string, config: AgentConnectConfig) => {
            if (towns?.syncAgent) {
                return
            }
            const mergedConfig = {
                ...config,
                ...towns?.config,
                onTokenExpired: () => {
                    towns?.config?.onTokenExpired?.()
                    towns?.setSyncAgent(undefined)
                },
            }
            setConnecting(true)
            return connectTownsWithBearerToken(bearerToken, mergedConfig)
                .then((syncAgent) => {
                    towns?.setSyncAgent(syncAgent)
                    return syncAgent
                })
                .finally(() => setConnecting(false))
        },
        [towns],
    )

    const disconnect = useCallback(() => towns?.setSyncAgent(undefined), [towns])

    const isAgentConnected = useMemo(() => !!towns?.syncAgent, [towns])

    return {
        /** Connect to Towns Protocol using a Signer */
        connect,
        /** Connect to Towns Protocol using a Bearer Token */
        connectUsingBearerToken,
        /** Disconnect from Towns Protocol */
        disconnect,
        /** Whether the agent is currently connecting */
        isAgentConnecting,
        /** Whether the agent is connected */
        isAgentConnected,
        /** The environment of the current connection (gamma, omega, alpha, local_dev, etc.) */
        env: towns?.syncAgent?.config.riverConfig.environmentId,
    }
}
