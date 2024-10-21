import type { SyncAgentConfig } from '@river-build/sdk'
import { useCallback, useMemo, useState } from 'react'
import type { ethers } from 'ethers'
import { connectRiverWithBearerToken, signAndConnect } from './connectRiver'
import { useRiverSync } from './internals/useRiverSync'

export const useAgentConnection = () => {
    const [isAgentConnecting, setConnecting] = useState(false)
    const river = useRiverSync()

    const connect = useCallback(
        async (signer: ethers.Signer, config: Omit<SyncAgentConfig, 'context'>) => {
            if (river?.syncAgent) {
                return
            }

            setConnecting(true)
            return signAndConnect(signer, config)
                .then((syncAgent) => {
                    river?.setSyncAgent(syncAgent)
                    return syncAgent
                })
                .finally(() => setConnecting(false))
        },
        [river],
    )

    const connectUsingBearerToken = useCallback(
        async (bearerToken: string, config: Omit<SyncAgentConfig, 'context'>) => {
            if (river?.syncAgent) {
                return
            }
            setConnecting(true)
            return connectRiverWithBearerToken(bearerToken, config)
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
        connect,
        connectUsingBearerToken,
        disconnect,
        isAgentConnecting,
        isAgentConnected,
        env: river?.syncAgent?.config.riverConfig.environmentId,
    }
}
