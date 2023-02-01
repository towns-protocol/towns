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
        (eventId: string, matrixEvent: MatrixEvent) => {
            const promise = matrixClient?.decryptEventIfNeeded(matrixEvent, {
                isRetry: true,
                emit: true,
                forceRedecryptIfUntrusted: true,
            })
            setDecryptionAttempts((prev) => {
                return {
                    ...prev,
                    [eventId]: {
                        eventId: eventId,
                        lastAttemptedAt: Date.now(),
                        promise,
                        retry: () => retryRedecryptEvent(eventId, matrixEvent),
                    } satisfies DecryptionAttempt,
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
                    return matrixEvent ? [{ eventId: event.eventId, matrixEvent: matrixEvent }] : []
                })
                .map((x) => {
                    console.log('attempting to re-decrypt event', x.eventId)
                    return {
                        eventId: x.eventId,
                        lastAttemptedAt: Date.now(),
                        promise: matrixClient?.decryptEventIfNeeded(x.matrixEvent, {
                            isRetry: true,
                            emit: true,
                            forceRedecryptIfUntrusted: true,
                        }),
                        retry: () => retryRedecryptEvent(x.eventId, x.matrixEvent),
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
