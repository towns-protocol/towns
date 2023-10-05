import { Stream } from '@river/sdk'
import { useZionContext } from '../../components/ZionContextProvider'
import { useEffect, useState } from 'react'
import { RoomIdentifier } from '../../types/room-identifier'

export function useCasablancaStream(streamId?: RoomIdentifier): Stream | undefined {
    const { casablancaClient } = useZionContext()
    const [stream, setStream] = useState<Stream | undefined>(() =>
        streamId ? casablancaClient?.stream(streamId.networkId) : undefined,
    )
    useEffect(() => {
        // initial conditions
        if (!casablancaClient || !streamId) {
            return
        }
        // fetch stream first time the effect runs, if it was previously set
        // to the same reference, it shouldn't trigger any re-render according to documentation
        const stream = casablancaClient.stream(streamId.networkId)
        // if it exists now (in the time it took for the effect to run) we're done!
        if (stream) {
            setStream(stream)
            return
        }
        // callback for when stream is initialized
        const onStreamInitialized = (inStreamId: string) => {
            if (inStreamId === streamId.networkId) {
                const stream = casablancaClient.stream(streamId.networkId)
                setStream(stream)
                casablancaClient.off('streamInitialized', onStreamInitialized)
            }
        }
        // wait for it to be initialized
        casablancaClient.on('streamInitialized', onStreamInitialized)
        // clean up listeners
        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
        }
    }, [casablancaClient, streamId])

    return stream
}
