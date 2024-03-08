import { useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'

export const useStreamUpToDate = (streamId?: string) => {
    const { casablancaClient } = useTownsContext()
    const [upToDate, setUpToDate] = useState(true)

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const onUpToDate = (updatedStreamId: string) => {
            if (updatedStreamId !== streamId) {
                return
            }
            const stream = casablancaClient.streams.get(streamId)
            setUpToDate(stream?.isUpToDate ?? false)
        }
        if (streamId) {
            onUpToDate(streamId)
        }

        casablancaClient.on('streamUpToDate', onUpToDate)
        return () => {
            casablancaClient.off('streamUpToDate', onUpToDate)
        }
    }, [casablancaClient, setUpToDate, streamId])
    return { upToDate }
}
