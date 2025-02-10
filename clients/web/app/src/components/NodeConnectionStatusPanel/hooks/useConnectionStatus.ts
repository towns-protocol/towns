import { useEffect, useState } from 'react'
import { useNetworkStatus } from 'use-towns-client'
import { useSafeTownsContext } from './useSafeTownsContext'

/**
 * TODO: placeholder / ideally this hook should include logic from decryption
 * status too.tbd. if not it could be moved to lib (i.e. merge w/ useStreamUpToDate)
 */
export const useConnectionStatus = () => {
    const { isOffline } = useNetworkStatus()
    const { casablancaClient, clientStatus } = useSafeTownsContext()

    const nodeUrl = casablancaClient?.rpcClient.url
    const [unsyncedStreams, setUnsyncedStreams] = useState<Set<string>>(() => new Set())

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateStreamStatus = (streamId: string) => {
            const stream = casablancaClient.streams.get(streamId)
            if (stream) {
                setUnsyncedStreams((s) => {
                    if (stream.isUpToDate && s.has(stream.streamId)) {
                        s.delete(stream.streamId)
                        return new Set(s)
                    }
                    if (!stream.isUpToDate && !s.has(stream.streamId)) {
                        s.add(stream.streamId)
                        return new Set(s)
                    }
                    return s
                })
            }
        }

        const onStreamSyncActive = (_active: boolean) => {
            setUnsyncedStreams((s) => {
                return new Set(
                    casablancaClient.streams
                        .getStreams()
                        .filter((x) => !x.isUpToDate)
                        .map((x) => x.streamId),
                )
            })
        }

        casablancaClient.on('streamInitialized', updateStreamStatus)
        casablancaClient.on('streamUpToDate', updateStreamStatus)
        casablancaClient.on('streamSyncActive', onStreamSyncActive)

        return () => {
            casablancaClient.off('streamInitialized', updateStreamStatus)
            casablancaClient.off('streamUpToDate', updateStreamStatus)
            casablancaClient.off('streamSyncActive', onStreamSyncActive)
        }
    }, [casablancaClient])

    const status = isOffline
        ? ('disconnected' as const)
        : !clientStatus?.streamSyncActive || unsyncedStreams.size > 0
        ? ('syncing' as const)
        : ('synced' as const)

    return { connectionStatus: status, nodeUrl }
}
