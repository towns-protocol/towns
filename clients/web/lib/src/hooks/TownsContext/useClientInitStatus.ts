import { Client as CasablancaClient, ClientInitStatus } from '@river/sdk'
import { useEffect, useMemo, useState } from 'react'

export function useClientInitStatus(client?: CasablancaClient) {
    const [clientStatus, setClientStatus] = useState<
        ClientInitStatus & { streamSyncActive: boolean }
    >({
        isLocalDataLoaded: false,
        isRemoteDataLoaded: false,
        progress: 0,
        streamSyncActive: false,
    })

    useEffect(() => {
        if (!client) {
            return
        }

        const updateStreamSyncActive = (active: boolean) => {
            setClientStatus((prev) => ({
                ...prev,
                streamSyncActive: active,
            }))
        }

        const updateClientInitStatus = (status: ClientInitStatus) => {
            setClientStatus((prev) => ({
                ...status,
                streamSyncActive: prev.streamSyncActive,
            }))
        }

        updateClientInitStatus(client.clientInitStatus)
        updateStreamSyncActive(client.streamSyncActive)
        client.on('streamSyncActive', updateStreamSyncActive)
        client.on('clientInitStatusUpdated', updateClientInitStatus)

        return () => {
            client.off('streamSyncActive', updateStreamSyncActive)
            client.off('clientInitStatusUpdated', updateClientInitStatus)
        }
    }, [client, setClientStatus])
    return useMemo(
        () => ({
            clientStatus,
        }),
        [clientStatus],
    )
}
