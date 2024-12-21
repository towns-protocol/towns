import { useCallback, useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'

export const useStreamEncryptionAlgorithm = (streamId?: string) => {
    const { casablancaClient } = useTownsContext()
    const [streamEncryptionAlgorithm, setStreamEncryptionAlgorithm] = useState<string | undefined>(
        undefined,
    )

    const setEncryptionAlgorithm = useCallback(
        (algorithm?: string) => {
            if (!casablancaClient) {
                return
            }
            if (!streamId) {
                return
            }
            casablancaClient
                .setStreamEncryptionAlgorithm(streamId, algorithm)
                .then(() => {
                    setStreamEncryptionAlgorithm(algorithm)
                })
                .catch((e) => {
                    console.error('failed to set stream encryption algorithm', e)
                })
        },
        [casablancaClient, streamId],
    )

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const onStreamUpdated = (updatedStreamId: string) => {
            if (updatedStreamId !== streamId) {
                return
            }
            const stream = casablancaClient.streams.get(streamId)
            setStreamEncryptionAlgorithm(stream?._view.membershipContent.encryptionAlgorithm)
        }

        if (streamId) {
            onStreamUpdated(streamId)
        }
        casablancaClient.on('streamEncryptionAlgorithmUpdated', onStreamUpdated)
        return () => {
            casablancaClient.off('streamEncryptionAlgorithmUpdated', onStreamUpdated)
        }
    }, [casablancaClient, setStreamEncryptionAlgorithm, streamId])
    return { streamEncryptionAlgorithm, setEncryptionAlgorithm }
}
