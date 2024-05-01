import { useEffect } from 'react'
import { useTownsContext } from 'use-towns-client'
import { create } from 'zustand'

export type ConnectionEventData = {
    type: 'connection'
    nodeUrl: string
    timestamp: number
}

export const useConnectionHistory = () => {
    const { casablancaClient } = useTownsContext()
    const nodeUrl = casablancaClient?.rpcClient.url

    const { events: statusEvents, appendEvent: appendStatusEvent } = useHistoryStore(
        ({ events, appendEvent }) => ({
            events: events,
            appendEvent: appendEvent,
        }),
    )

    useEffect(() => {
        const prev = statusEvents[statusEvents.length - 1]
        if (nodeUrl && (!prev || (prev.nodeUrl !== nodeUrl && prev.type === 'connection'))) {
            appendStatusEvent({
                type: 'connection',
                nodeUrl,
            })
        }
    }, [appendStatusEvent, nodeUrl, statusEvents])

    return { statusEvents }
}

const useHistoryStore = create<{
    appendEvent: (event: Omit<ConnectionEventData, 'timestamp'>) => void
    events: ConnectionEventData[]
}>((set) => ({
    appendEvent: (event) =>
        set((state) => ({
            events: [...state.events, { ...event, timestamp: Date.now() }],
        })),
    events: [],
}))
