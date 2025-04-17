import { useEffect } from 'react'
import { FullyReadMarker } from '@towns-protocol/proto'
import { useRawTimelineStore } from '../store/use-timeline-store'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { getChannelsFromSpaceData } from './use-channels'
import { create } from 'zustand'
import { TownsOpts } from 'client/TownsClientTypes'
import debounce from 'lodash/debounce'
import { useSpaceDataStore } from './use-space-data'
import isEqual from 'lodash/isEqual'
import { useSpaceId } from './use-space-id'
import { ThreadResult, ThreadStatsData } from '@towns-protocol/sdk'

const EMPTY_THREADS: ThreadResult[] = []

interface SpaceThreadRootsStore {
    threads: Record<string, ThreadResult[]>
    setThreads: (spaceId: string, threads: ThreadResult[]) => void
}

const useSpaceThreadRootsStore = create<SpaceThreadRootsStore>((set) => ({
    threads: {},
    setThreads: (spaceId: string, threads: ThreadResult[]) =>
        set((state) => {
            const prevThreads = state.threads[spaceId]
            if (isEqual(prevThreads, threads)) {
                return state
            }
            return { threads: { ...state.threads, [spaceId]: threads } }
        }),
}))

/// only called once in context provider
export function useCalculateSpaceThreadRoots(_opts: TownsOpts) {
    useEffect(() => {
        const runUpdate = () => {
            const unreadMarkers = useFullyReadMarkerStore.getState().markers
            const threadsStats = useRawTimelineStore.getState().threadsStats
            const spaceData = useSpaceDataStore.getState().spaceDataMap

            for (const spaceId in spaceData) {
                const space = spaceData[spaceId]
                if (!space) {
                    continue
                }
                const channels = getChannelsFromSpaceData(space.channelGroups)
                const threads: ThreadResult[] = []

                channels.forEach((channel) => {
                    const channelThreadStats: Record<string, ThreadStatsData> =
                        threadsStats[channel.id] || {}

                    const channelThreads = Object.values(channelThreadStats)
                        .filter((thread) => thread.isParticipating)
                        .map(
                            (thread) =>
                                ({
                                    type: 'thread' as const,
                                    isNew: isNew(unreadMarkers[thread.parentId]),
                                    isUnread: unreadMarkers[thread.parentId]?.isUnread === true,
                                    fullyReadMarker: unreadMarkers[thread.parentId],
                                    thread,
                                    channel: { id: channel.id, label: channel.label },
                                    timestamp: thread.latestTs,
                                } satisfies ThreadResult),
                        )

                    threads.push(...channelThreads)
                })

                threads.sort(
                    //firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
                    (a: ThreadResult, b: ThreadResult): number => {
                        if (a.isUnread && !b.isUnread) {
                            return -1
                        } else if (!a.isUnread && b.isUnread) {
                            return 1
                        } else if (a.timestamp > b.timestamp) {
                            return -1
                        } else if (a.timestamp < b.timestamp) {
                            return 1
                        } else {
                            return 0
                        }
                    },
                )

                useSpaceThreadRootsStore.getState().setThreads(spaceId, threads)
            }
        }

        const debouncedRunUpdate = debounce(runUpdate, 1000, { maxWait: 1500 })

        const unsub1 = useSpaceDataStore.subscribe(debouncedRunUpdate)
        const unsub2 = useRawTimelineStore.subscribe(debouncedRunUpdate)
        const unsub3 = useFullyReadMarkerStore.subscribe(debouncedRunUpdate)

        return () => {
            unsub1()
            unsub2()
            unsub3()
        }
    }, [])
}

export function useSpaceThreadRootsForId(spaceId: string | undefined): ThreadResult[] | undefined {
    return useSpaceThreadRootsStore((state) => (spaceId ? state.threads[spaceId] : undefined))
}

// fuckin hell
export function useSpaceThreadRoots(): ThreadResult[] {
    const spaceId = useSpaceId()
    const threads = useSpaceThreadRootsForId(spaceId)
    return threads ?? EMPTY_THREADS
}

export function useSpaceThreadRootsUnreadCount(): number {
    const roots = useSpaceThreadRoots()
    return roots.filter((t) => t.isUnread).length
}

function isNew(marker?: FullyReadMarker) {
    if (!marker) {
        return false
    }
    const now = Date.now()
    return marker.isUnread || (!marker.isUnread && BigInt(now) - marker.markedReadAtTs < 4000)
}
