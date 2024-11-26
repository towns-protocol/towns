import type { SyncAgentConfig } from '@river-build/sdk'
import { useCallback, useMemo, useState } from 'react'
import type { ethers } from 'ethers'
import { connectRiverWithBearerToken, signAndConnect } from './connectRiver'
import { useRiverSync } from './internals/useRiverSync'

type AgentConnectConfig = Omit<SyncAgentConfig, 'context' | 'onTokenExpired'>

/**
 * Hook for managing the connection to the sync agent
 *
 * @example You can connect the Sync Agent to River using a Bearer Token or using a Signer.
 *
 * ### Bearer Token
 * ```tsx
 * import { useAgentConnection } from '@river-build/react-sdk'
 * import { makeRiverConfig } from '@river-build/sdk'
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
 * import { useAgentConnection } from '@river-build/react-sdk'
 * import { makeRiverConfig } from '@river-build/sdk'
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
 *       <button onClick={() => connect(signer, { riverConfig })}>
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
    const river = useRiverSync()

    const connect = useCallback(
        async (signer: ethers.Signer, config: AgentConnectConfig) => {
            if (river?.syncAgent) {
                return
            }
            const mergedConfig = {
                ...config,
                ...river?.config,
                onTokenExpired: () => {
                    river?.config?.onTokenExpired?.()
                    river?.setSyncAgent(undefined)
                },
            }
            setConnecting(true)
            return signAndConnect(signer, mergedConfig)
                .then((syncAgent) => {
                    river?.setSyncAgent(syncAgent)
                    return syncAgent
                })
                .finally(() => setConnecting(false))
        },
        [river],
    )

    const connectUsingBearerToken = useCallback(
        async (bearerToken: string, config: AgentConnectConfig) => {
            if (river?.syncAgent) {
                return
            }
            const mergedConfig = {
                ...config,
                ...river?.config,
                onTokenExpired: () => {
                    river?.config?.onTokenExpired?.()
                    river?.setSyncAgent(undefined)
                },
            }
            setConnecting(true)
            return connectRiverWithBearerToken(bearerToken, mergedConfig)
                .then((syncAgent) => {
                    river?.setSyncAgent(syncAgent)
                    return syncAgent
                })
                .finally(() => setConnecting(false))
        },
        [river],
    )

    const disconnect = useCallback(() => river?.setSyncAgent(undefined), [river])

    const isAgentConnected = useMemo(() => !!river?.syncAgent, [river])

    return {
        /** Connect to River using a Signer */
        connect,
        /** Connect to River using a Bearer Token */
        connectUsingBearerToken,
        /** Disconnect from River */
        disconnect,
        /** Whether the agent is currently connecting */
        isAgentConnecting,
        /** Whether the agent is connected */
        isAgentConnected,
        /** The environment of the current connection (gamma, omega, alpha, local_multi, etc.) */
        env: river?.syncAgent?.config.riverConfig.environmentId,
    }
}
