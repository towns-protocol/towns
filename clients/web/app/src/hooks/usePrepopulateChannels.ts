import debug from 'debug'
import { useCallback, useEffect, useRef } from 'react'
import { RoomIdentifier, sleep, useTimelineStore, useZionClient } from 'use-zion-client'

const info = debug('app:usePassiveScrollback')
const log = debug('app:usePassiveScrollback')

info.enabled = false
log.enabled = true

type QueueItem = {
    id: RoomIdentifier
    firstEventId?: string
    statusName: 'pending' | 'loading' | 'done' | 'error'
}

const EVENTS_PER_BATCH = 50
const SLEEP_DURATION_MS = 1000
const MAX_LOADED_EVENTS = 300
const MAX_SCROLLBACK_DATE_MS = 1000 * 60 * 60 * 24 * 60 // 60 days

const checkMaxReached = (eventCount: number, eventTimestamp?: number) => {
    const maxEventsReached = eventCount > MAX_LOADED_EVENTS
    const maxDateReached = Date.now() - MAX_SCROLLBACK_DATE_MS > (eventTimestamp ?? 0)
    return maxEventsReached || maxDateReached
}

const shortId = (id: RoomIdentifier) => id.networkId.slice(0, 8)

export const usePrepopulateChannels = (channelIds: RoomIdentifier[]) => {
    const { scrollback } = useZionClient()

    const channelStatusRef = useRef<Record<string, QueueItem>>({})
    const channelQueueRef = useRef<RoomIdentifier[]>([])

    const getChannelQueueStatus = useCallback(
        (id: RoomIdentifier) => channelStatusRef.current[id.networkId],
        [],
    )

    const getChannelEvents = useCallback((id: RoomIdentifier) => {
        return useTimelineStore.getState().timelines?.[id.networkId] ?? []
    }, [])

    const scrollbackChannel = useCallback(
        async (id: RoomIdentifier) => {
            const status = getChannelQueueStatus(id)
            const events = getChannelEvents(id)

            const firstEvent = events?.length ? events.at(0) : undefined
            status.firstEventId = firstEvent?.eventId

            if (!firstEvent) {
                info(shortId(id), `as no events and is likely not synced`)
            } else {
                // check thresholds before even attempting to load more events
                if (checkMaxReached(events.length, firstEvent.createdAtEpocMs)) {
                    // perhaps we don't need to load more events
                    status.statusName = 'done'
                    log(shortId(id), `max was reached (done)`)
                    return
                }
            }

            log(shortId(id), `start loading from index #${events.length}`)

            status.statusName = 'loading'

            // trigger scrollback and wait for result
            // TODO: "limit" may be redundant in the context of River
            const res = await scrollback(id, EVENTS_PER_BATCH)

            if (!res) {
                status.statusName = 'error'
                log(shortId(id), `error, scrollback attempt failed`)
                return
            } else {
                info(shortId(id), `scrollback result`, JSON.stringify(res, null, 2))
                if (res.terminus || checkMaxReached(res.eventCount, res.firstEventTimestamp)) {
                    status.statusName = 'done'
                    log(shortId(id), `fully done (end), ${res.eventCount} events`)
                } else {
                    status.statusName = 'pending'
                    status.firstEventId = res.firstEventId
                    log(shortId(id), `${res.eventCount - events.length} events loaded`)
                }
            }

            await sleep(SLEEP_DURATION_MS)
        },
        [getChannelEvents, getChannelQueueStatus, scrollback],
    )

    const checkQueueStatus = useCallback(async () => {
        const queue = channelQueueRef.current
        info(`queue: checking progress`)

        const running = queue.find((id) => getChannelQueueStatus(id).statusName === 'loading')

        if (running) {
            info(`queue: skipping, task already running (${running.networkId.slice(0, 6)})`)
            // make sure we only focus on one item at a time
            return
        }

        const pending = queue.find((s) => getChannelQueueStatus(s).statusName === 'pending')

        if (pending) {
            await scrollbackChannel(pending)
            // after loading and updating status, check again
            checkQueueStatus()
            return
        } else {
            // if no pending items, we're done
            log(`queue: done! ${queue.length === 0 ? '(was empty)' : `(${queue.length} channels)`}`)
        }
    }, [getChannelQueueStatus, scrollbackChannel])

    useEffect(() => {
        log(`prepopulateChannels()  ${channelIds.length} new`, channelIds.map(shortId))
        channelQueueRef.current = channelIds
        channelStatusRef.current = channelQueueRef.current.reduce((acc, id) => {
            acc[id.networkId] = acc[id.networkId] ?? {
                id,
                firstEventId: undefined,
                statusName: 'pending',
            }
            return acc
        }, channelStatusRef.current)
        checkQueueStatus()
        return () => {
            log(`prepopulateChannels() cleanup`)
            channelQueueRef.current = []
        }
    }, [channelIds, checkQueueStatus])
}
