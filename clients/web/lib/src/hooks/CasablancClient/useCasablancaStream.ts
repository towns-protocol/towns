import { Stream } from '@towns/client'
import { useZionContext } from '../../components/ZionContextProvider'
import { useEffect, useState } from 'react'

export function useCasablancaStream(streamId?: string): Stream | undefined {
    const [stream, setStream] = useState<Stream>()
    const { casablancaClient } = useZionContext()

    useEffect(() => {
        if (!casablancaClient || !streamId) {
            return
        }

        const updateStream = (stream?: Stream) => {
            setStream(stream)
        }

        let canceled = false

        const waitForStream = async () => {
            const stream = await casablancaClient.waitForStream(streamId)
            if (!canceled) {
                updateStream(stream)
            }
        }

        void waitForStream()

        return () => {
            canceled = true
        }
    }, [casablancaClient, streamId])

    return stream
}
