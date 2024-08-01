import {
    StreamStateView,
    StreamTimelineEvent,
    UnauthenticatedClient,
    isDefined,
    isRemoteEvent,
    makeRiverRpcClient,
    userIdFromAddress,
} from '@river-build/sdk'
import { useEffect } from 'react'
import { AuthStatus, makeProviderFromConfig, useConnectivity } from 'use-towns-client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { MembershipOp } from '@river-build/proto'
import { immer } from 'zustand/middleware/immer'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { DAY_MS, WEEK_MS } from 'data/constants'
import { notUndefined } from 'ui/utils/utils'

type ActivityEvent = {
    userId: string
    timestamp: number
    type: 'joinedUser' | 'createChannel' | 'createSpace'
}

type TownStats = {
    numJoinedUsers: number
    latestJoinedUsers: ActivityEvent[] | undefined
    spaceCreateEvent: ActivityEvent | undefined
    latestCreatedChannels: ActivityEvent[] | undefined
}
type ChannelStats = {
    numMessages: number
    activeUsers: string[]
}

const useFetchStore = create(
    persist(
        immer<{
            isLoading: boolean
            members: Record<string, string[]>
            channelStats: Record<string, ChannelStats>
            townStats: Record<string, TownStats>
            setMembers: (townId: string, members: string[]) => void
            setChannelStats: (townId: string, s: ChannelStats) => void
            appendChannelStats: (townId: string, s: Omit<ChannelStats, 'numActiveUsers'>) => void
            setTownStats: (townId: string, s: Partial<TownStats>) => void
            setIsLoading: (isLoading: boolean) => void
        }>((set, get) => ({
            isLoading: true,
            members: {},
            channelStats: {},
            townStats: {},
            setMembers: (townId, members) => {
                set((state) => {
                    state.members[townId] = members
                })
            },
            setChannelStats: (townId, s) => {
                set((state) => {
                    state.channelStats[townId] = {
                        ...(state.channelStats[townId] ?? {}),
                        ...s,
                    }
                })
            },
            appendChannelStats: (townId, s) => {
                set((state) => {
                    const activeUsers = state.channelStats[townId]?.activeUsers ?? []
                    const numMessages = state.channelStats[townId]?.numMessages ?? 0
                    state.channelStats[townId] = {
                        activeUsers: Array.from(new Set([...activeUsers, ...s.activeUsers])),
                        numMessages: numMessages + s.numMessages,
                    }
                })
            },
            setTownStats: (townId: string, s: Partial<TownStats>) => {
                set((state) => {
                    state.townStats[townId] = {
                        ...(state.townStats[townId] ?? {}),
                        ...s,
                    }
                })
            },
            setIsLoading: (isLoading: boolean) =>
                set((state) => {
                    state.isLoading = isLoading
                }),
        })),
        {
            name: 'unauthenticated-activity',
            version: 2,
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
)

export const useFetchUnauthenticatedActivity = (townId: string) => {
    const { authStatus } = useConnectivity()
    const {
        appendChannelStats,
        channelStats,
        isLoading,
        members,
        setChannelStats,
        setIsLoading,
        setMembers,
        setTownStats,
        townStats,
    } = useFetchStore(
        useShallow((s) => ({
            appendChannelStats: s.appendChannelStats,
            channelStats: s.channelStats,
            isLoading: s.isLoading,
            members: s.members,
            setChannelStats: s.setChannelStats,
            setIsLoading: s.setIsLoading,
            setMembers: s.setMembers,
            setTownStats: s.setTownStats,
            townStats: s.townStats,
        })),
    )

    const { riverChainConfig, riverChain } = useEnvironment()

    useEffect(() => {
        if (!riverChainConfig || authStatus === AuthStatus.EvaluatingCredentials) {
            return
        }
        const abortController = new AbortController()

        setIsLoading(true)

        const fetch = async () => {
            const provider = makeProviderFromConfig(riverChain)

            try {
                console.log('[TownPageActivity] fetch hook enter')
                const streamId = townId
                const rpcClient = await withAbort(
                    () => makeRiverRpcClient(provider, riverChainConfig),
                    abortController,
                )
                if (!rpcClient) {
                    return
                }
                const client = new UnauthenticatedClient(rpcClient)
                const stream = await withAbort(() => client.getStream(streamId), abortController)

                if (!stream) {
                    return
                }

                let numJoinedUsers = initialJoinedUsers(stream)
                setTownStats(townId, {
                    numJoinedUsers: 0,
                    latestJoinedUsers: [],
                    spaceCreateEvent: undefined,
                    latestCreatedChannels: undefined,
                })

                setMembers(townId, Array.from(stream.getMembers().membership.joinedUsers))

                const fetchTownStats = async () => {
                    await withAbort(() => client.scrollbackToDate(stream, WEEK_MS), abortController)
                    numJoinedUsers = getJoinedUsersAfterScrollback(stream.timeline, WEEK_MS)
                    const spaceCreateEvent = getSpaceCreatedEvent(stream.timeline)
                    setTownStats(townId, {
                        numJoinedUsers: Array.from(numJoinedUsers).length,
                        latestJoinedUsers: numJoinedUsers,
                        spaceCreateEvent: spaceCreateEvent,
                        latestCreatedChannels: undefined,
                    })
                }

                void fetchTownStats()

                const channelsIds = Array.from(stream.spaceContent.spaceChannelsMetadata.keys())
                const channelCreatedEvents: StreamTimelineEvent[] = []

                let firstData = true

                const fetchChannelStats = async (channelId: string) => {
                    const channelStats = await withAbort(
                        () => getChannelStats(client, channelId),
                        abortController,
                    )
                    if (!channelStats) {
                        return
                    }

                    channelCreatedEvents.concat(channelStats.channelInception)

                    if (firstData) {
                        // prevent appending data until first fetch is done
                        firstData = false
                        setChannelStats(townId, {
                            numMessages: channelStats.numMessages,
                            activeUsers: Array.from(channelStats.activeUsers),
                        })
                    } else {
                        appendChannelStats(townId, {
                            numMessages: channelStats.numMessages,
                            activeUsers: Array.from(channelStats.activeUsers),
                        })
                    }
                }
                console.log(
                    `[TownPageActivity] fetch hook fetchChannelStats (${channelsIds?.length} channels)`,
                )
                await Promise.all(channelsIds.map((channelId) => fetchChannelStats(channelId)))

                console.log('[TownPageActivity] fetch hook fetchChannelStats done')

                setTownStats(townId, {
                    latestCreatedChannels: getLatestCreatedChannels(channelCreatedEvents),
                })

                setIsLoading(false)
            } catch (error) {
                console.error(error)
            }
        }

        fetch()

        return () => {
            console.log('TownPageActivity fetch hook exit')
            abortController.abort()
        }
    }, [
        appendChannelStats,
        authStatus,
        riverChain,
        riverChainConfig,
        setChannelStats,
        setIsLoading,
        setMembers,
        setTownStats,
        townId,
    ])

    return {
        isLoading,
        townStats,
        channelStats,
        members,
    }
}

async function getChannelStats(client: UnauthenticatedClient, channelId: string) {
    console.log('TownPageActivity fetch channel', channelId)
    const streamView = await client.getStream(channelId)
    await client.scrollbackToDate(streamView, DAY_MS)
    const channelMessages = streamView.timeline.filter(
        (x) =>
            isRemoteEvent(x) &&
            x.remoteEvent.event.payload.case === 'channelPayload' &&
            x.remoteEvent.event.payload.value?.content.case === 'message',
    )

    const channelInception = streamView.timeline.filter(
        (x) =>
            isRemoteEvent(x) &&
            x.remoteEvent.event.payload.case === 'channelPayload' &&
            x.remoteEvent.event.payload.value?.content.case === 'inception',
    )

    const messages = channelMessages.filter((f) => isWithin(f.createdAtEpochMs, DAY_MS))

    const activeUsers = channelMessages
        .filter((f) => isWithin(f.createdAtEpochMs, DAY_MS))
        .reduce((acc, curr) => {
            acc.add(curr.creatorUserId)
            return acc
        }, new Set<string>())

    return {
        numMessages: messages.length,
        numActiveUsers: activeUsers.size,
        activeUsers,
        channelInception,
    }
}

function initialJoinedUsers(stream: StreamStateView) {
    return Array.from(stream.getMembers().joined.values()).map((m) => {
        return {
            userId: m.userId,
            timestamp: 0,
            type: 'joinedUser',
        }
    }) satisfies ActivityEvent[]
}

function getJoinedUsersAfterScrollback(timeline: StreamTimelineEvent[], ms: number) {
    return timeline
        .flatMap((e) => (isRemoteEvent(e) ? e : undefined))
        .filter(notUndefined)
        .filter(
            (s) =>
                s?.remoteEvent.event.payload.value?.content.case === 'membership' &&
                s.remoteEvent.event.payload.value?.content.value?.op === MembershipOp.SO_JOIN &&
                s.createdAtEpochMs > Date.now() - ms,
        )
        .map((s) => {
            if (s.remoteEvent.event.payload.value?.content.case === 'membership') {
                const userId = userIdFromAddress(
                    s.remoteEvent.event.payload.value.content.value.userAddress,
                )
                return {
                    userId: userId,
                    timestamp: Number(s.createdAtEpochMs),
                    type: 'joinedUser',
                } satisfies ActivityEvent
            } else {
                return undefined
            }
        })
        .filter(isDefined)
        .sort((a, b) => b.timestamp - a.timestamp)
}

function getSpaceCreatedEvent(timeline: StreamTimelineEvent[]) {
    let spaceCreateEvent: ActivityEvent | undefined = undefined
    const ineceptionEvent = timeline
        .filter(
            (x) =>
                isRemoteEvent(x) &&
                x.remoteEvent.event.payload.case === 'spacePayload' &&
                x.remoteEvent.event.payload.value?.content.case === 'inception',
        )
        .at(0)
    if (ineceptionEvent?.remoteEvent?.event.payload.value?.content.case === 'inception') {
        const userId = userIdFromAddress(ineceptionEvent.remoteEvent.event.creatorAddress)
        spaceCreateEvent = {
            userId: userId,
            timestamp: Number(ineceptionEvent.createdAtEpochMs),
            type: 'createSpace',
        }
    }
    return spaceCreateEvent
}

async function withAbort<T>(
    promise: () => Promise<T>,
    controllerIn: AbortController,
): Promise<T | undefined> {
    return new Promise<T>((resolve, reject) => {
        const controller = new AbortController()

        const wrappedAbort = () => {
            controller.abort()
        }

        const internalAbort = () => {
            console.warn(`Aborting ${promise.toString()}`)
            reject(undefined)
        }

        controllerIn.signal.addEventListener('abort', wrappedAbort)

        controller.signal.addEventListener('abort', internalAbort)

        promise()
            .then(resolve)
            .catch((error) => {
                if (error !== undefined) {
                    reject(error)
                }
            })
            .finally(() => {
                controllerIn.signal.removeEventListener('abort', wrappedAbort)
                controller.signal.removeEventListener('abort', internalAbort)
            })
    })
}

function getLatestCreatedChannels(createdChannelEvents: StreamTimelineEvent[]) {
    return createdChannelEvents
        .slice()
        .sort((a, b) => Number(a.createdAtEpochMs) - Number(b.createdAtEpochMs))
        .map((event) => ({
            userId: event.creatorUserId,
            timestamp: Number(event.createdAtEpochMs),
            type: 'createChannel',
        })) satisfies ActivityEvent[]
}
function isWithin(number: number | bigint, time: number) {
    const minEpochMs = Date.now() - time
    return number > minEpochMs
}
