import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'

export function useStreamSyncActive(client?: CasablancaClient) {
    const [streamSyncActive, setStreamSyncActive] = useState(false)

    useEffect(() => {
        if (!client) {
            return
        }
        setStreamSyncActive(client.streamSyncActive)
        client.on('streamSyncActive', setStreamSyncActive)

        return () => {
            client.off('streamSyncActive', setStreamSyncActive)
        }
    }, [client, setStreamSyncActive])
    return { streamSyncActive }
}
