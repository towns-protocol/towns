import { useCallback, useEffect, useState } from 'react'
import { DecryptionAttempt, TimelineEvent, ZTEvent } from '../types/timeline-types'
import { useZionContext } from '../components/ZionContextProvider'
import { SpaceProtocol } from '../client/ZionClientTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { MatrixEvent } from 'matrix-js-sdk'

export function useTimelineRedecryptor(roomId?: RoomIdentifier, timeline?: TimelineEvent[]) {
    const matrixClient = useZionContext()?.client?.matrixClient

    const [decryptionAttempts, setDecryptionAttempts] = useState<Record<string, DecryptionAttempt>>(
        {},
    )

    const retryRedecryptEvent = useCallback(
        (matrixEvent: MatrixEvent) => {
            const promise = matrixClient?.decryptEventIfNeeded(matrixEvent, {
                isRetry: true,
                emit: true,
                forceRedecryptIfUntrusted: true,
            })
            setDecryptionAttempts((prev) => {
                return {
                    ...prev,
                    [matrixEvent.getId()]: {
                        eventId: matrixEvent.getId(),
                        lastAttemptedAt: Date.now(),
                        promise,
                        retry: () => retryRedecryptEvent(matrixEvent),
                    },
                }
            })
            return promise
        },
        [matrixClient],
    )

    // try to decrypt any pending events
    useEffect(() => {
        if (!matrixClient || !timeline || !roomId || roomId.protocol !== SpaceProtocol.Matrix) {
            return
        }
        setDecryptionAttempts((prev) => {
            // attempt to decrypt everything, save off promises
            const attempts = timeline
                .filter((event) => event.content?.kind === ZTEvent.RoomMessageEncrypted)
                .filter(
                    (event) =>
                        !prev[event.eventId] ||
                        prev[event.eventId].lastAttemptedAt < Date.now() - 1000,
                )
                .flatMap((event) => {
                    const matrixEvent = matrixClient
                        .getRoom(roomId.networkId)
                        ?.findEventById(event.eventId)
                    return matrixEvent ? [matrixEvent] : []
                })
                .map((matrixEvent) => {
                    console.log('attempting to re-decrypt event', matrixEvent.getId())
                    return {
                        eventId: matrixEvent.getId(),
                        lastAttemptedAt: Date.now(),
                        promise: matrixClient?.decryptEventIfNeeded(matrixEvent, {
                            isRetry: true,
                            emit: true,
                            forceRedecryptIfUntrusted: true,
                        }),
                        retry: () => retryRedecryptEvent(matrixEvent),
                    }
                })
                .reduce((acc, attempt) => {
                    acc[attempt.eventId] = attempt
                    return acc
                }, {} as Record<string, DecryptionAttempt>)

            // update state

            return { ...prev, ...attempts }
        })
    }, [matrixClient, retryRedecryptEvent, roomId, timeline])

    return decryptionAttempts
}
