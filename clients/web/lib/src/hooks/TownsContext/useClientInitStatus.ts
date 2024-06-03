import { Client as CasablancaClient, ClientInitStatus } from '@river/sdk'
import { useEffect, useState } from 'react'

export function useClientInitStatus(client?: CasablancaClient) {
    const [clientStatus, setClientStatus] = useState(() => ({
        isLocalDataLoaded: false,
        isRemoteDataLoaded: false,
        streamSyncActive: false,
    }))

    useEffect(() => {
        if (!client) {
            return
        }

        const updateStreamSyncActive = (active: boolean) => {
            setClientStatus((prev) => {
                if (prev.streamSyncActive === active) {
                    return prev
                } else {
                    return {
                        ...prev,
                        streamSyncActive: active,
                    }
                }
            })
        }

        const updateClientInitStatus = (status: ClientInitStatus) => {
            // This code intentionally ignore the progress field
            // to reduce the number of re-renders
            setClientStatus((prev) => {
                if (
                    status.isLocalDataLoaded === prev.isLocalDataLoaded &&
                    status.isRemoteDataLoaded === prev.isRemoteDataLoaded
                ) {
                    return prev
                } else {
                    return {
                        isLocalDataLoaded: status.isLocalDataLoaded,
                        isRemoteDataLoaded: status.isRemoteDataLoaded,
                        streamSyncActive: prev.streamSyncActive,
                    }
                }
            })
        }

        updateClientInitStatus(client.clientInitStatus)
        updateStreamSyncActive(client.streamSyncActive)
        client.on('streamSyncActive', updateStreamSyncActive)
        client.on('clientInitStatusUpdated', updateClientInitStatus)

        return () => {
            client.off('streamSyncActive', updateStreamSyncActive)
            client.off('clientInitStatusUpdated', updateClientInitStatus)
        }
    }, [client])

    return clientStatus
}
