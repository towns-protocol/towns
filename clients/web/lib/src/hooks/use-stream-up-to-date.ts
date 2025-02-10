import { useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'

export const useStreamUpToDate = (streamId?: string) => {
    const { casablancaClient } = useTownsContext()
    const [upToDate, setUpToDate] = useState(
        () =>
            streamId &&
            casablancaClient &&
            casablancaClient.streams.get(streamId)?.isUpToDate === true,
    )

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        // check to see if the stream isUpToDate returns true, update state
        const onUpToDate = (updatedStreamId: string) => {
            if (updatedStreamId !== streamId) {
                return
            }
            const stream = casablancaClient.streams.get(streamId)
            setUpToDate(stream?.isUpToDate ?? false)
        }
        // on active, check our passed in streamId
        const onStreamSyncActive = (_active: boolean) => {
            if (streamId) {
                onUpToDate(streamId)
            }
        }
        // on first run, check our passed in streamId
        if (streamId) {
            onUpToDate(streamId)
        }

        casablancaClient.on('streamUpToDate', onUpToDate)
        casablancaClient.on('streamSyncActive', onStreamSyncActive)
        return () => {
            casablancaClient.off('streamUpToDate', onUpToDate)
            casablancaClient.off('streamSyncActive', onStreamSyncActive)
        }
    }, [casablancaClient, setUpToDate, streamId])
    return { upToDate }
}
