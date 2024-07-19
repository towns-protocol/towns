import { Pin } from '@river-build/sdk'
import { useTownsContext } from '../components/TownsContextProvider'
import isEqual from 'lodash/isEqual'
import { useEffect, useState } from 'react'
import { TimelineEvent } from 'types/timeline-types'
import { toEvent } from './TownsContext/useCasablancaTimelines'

export type TimelinePin = Pin & {
    timelineEvent: TimelineEvent
}

export function usePins(streamId?: string): TimelinePin[] | undefined {
    const { casablancaClient: client } = useTownsContext()

    const [pins, setPins] = useState<TimelinePin[] | undefined>(() => {
        if (!streamId || !client) {
            return undefined
        }
        return (
            client
                .stream(streamId)
                ?.view.getMembers()
                ?.pins.map((x) => toTimelinePin(x, client.userId)) ?? []
        )
    })

    useEffect(() => {
        if (!client || !streamId) {
            return
        }

        // helpers
        const updateState = () => {
            const pins =
                client
                    .stream(streamId)
                    ?.view.getMembers()
                    ?.pins.map((x) => toTimelinePin(x, client.userId)) ?? []
            setPins((prev) => {
                if (isEqual(prev, pins)) {
                    return prev
                }
                return pins
            })
        }

        // subscribe to changes
        const onPinUpdated = (inStreamId: string) => {
            if (inStreamId === streamId) {
                updateState()
            }
        }

        updateState()

        client.on('channelPinDecrypted', onPinUpdated)
        client.on('channelPinAdded', onPinUpdated)
        client.on('channelPinRemoved', onPinUpdated)

        return () => {
            client.off('channelPinDecrypted', onPinUpdated)
            client.off('channelPinAdded', onPinUpdated)
            client.off('channelPinRemoved', onPinUpdated)
        }
    }, [client, streamId])

    return pins
}

function toTimelinePin(pin: Pin, userId: string): TimelinePin {
    return {
        ...pin,
        timelineEvent: toEvent(pin.event, userId),
    }
}
