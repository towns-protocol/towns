import { Stream } from '@river/sdk'
import { useTownsContext } from '../../components/TownsContextProvider'
import { useEffect, useState } from 'react'

export function useCasablancaStream(streamId?: string): Stream | undefined {
    const { casablancaClient } = useTownsContext()
    const [stream, setStream] = useState<Stream | undefined>(() =>
        streamId ? casablancaClient?.stream(streamId) : undefined,
    )
    useEffect(() => {
        // initial conditions
        if (!casablancaClient || !streamId) {
            return
        }
        // fetch stream first time the effect runs, if it was previously set
        // to the same reference, it shouldn't trigger any re-render according to documentation
        const stream = casablancaClient.stream(streamId)
        // if it exists now (in the time it took for the effect to run) we're done!
        if (stream) {
            setStream(stream)
            return
        }
        // callback for when stream is initialized
        const onStreamInitialized = (inStreamId: string) => {
            if (inStreamId === streamId) {
                const stream = casablancaClient.stream(streamId)
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
