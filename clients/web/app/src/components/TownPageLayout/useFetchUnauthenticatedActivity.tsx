import {
    StreamStateView,
    StreamTimelineEvent,
    UnauthenticatedClient,
    isDefined,
    isRemoteEvent,
    makeRiverRpcClient,
    userIdFromAddress,
} from '@river/sdk'
import { useEffect } from 'react'
import { LoginStatus, makeProviderFromConfig, useConnectivity } from 'use-towns-client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { MembershipOp } from '@river-build/proto'
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
    numActiveUsers: number
    // session storage, this should be an array
    activeUsers: string[]
}

const useFetchStore = create(
    persist<{
        isLoading: boolean
        members: string[]
        channelStats: ChannelStats
        townStats: TownStats
        setMembers: (members: string[]) => void
        setChannelStats: (fn: (args: ChannelStats) => ChannelStats) => void
        setTownStats: (fn: (args: TownStats) => TownStats) => void
        setIsLoading: (isLoading: boolean) => void
    }>(
        (set, get) => ({
            isLoading: true,
            members: [],
            channelStats: {
                numMessages: 0,
                numActiveUsers: 0,
                activeUsers: [],
            },
            townStats: {
                numJoinedUsers: 0,
                latestJoinedUsers: undefined,
                spaceCreateEvent: undefined,
                latestCreatedChannels: undefined,
            },
            setMembers: (members: string[]) => set({ members }),
            setChannelStats: (fn) => {
                const state = get().channelStats
                return set({ channelStats: fn(state) })
            },
            setTownStats: (fn) => {
                const state = get().townStats
                return set({ townStats: fn(state) })
            },
            setIsLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'unauthenticated-activity',
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
)

export const useFetchUnauthenticatedActivity = (townId: string) => {
    const { loginStatus } = useConnectivity()
    const {
        isLoading,
        members,
        channelStats,
        townStats,
        setChannelStats,
        setTownStats,
        setMembers,
        setIsLoading,
    } = useFetchStore(
        useShallow((s) => ({
            isLoading: s.isLoading,
            members: s.members,
            channelStats: s.channelStats,
            townStats: s.townStats,
            setMembers: s.setMembers,
            setChannelStats: s.setChannelStats,
            setTownStats: s.setTownStats,
            setIsLoading: s.setIsLoading,
        })),
    )

    const { riverChainConfig, riverChain } = useEnvironment()
    useEffect(() => {
        if (!riverChainConfig || loginStatus === LoginStatus.LoggingIn) {
            return
        }
        const abortController = new AbortController()

        setIsLoading(true)

        const fetch = async () => {
            const provider = makeProviderFromConfig(riverChain)

            try {
                console.log('TownPageActivity fetch space', townId)
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

                setTownStats(() => ({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                    latestJoinedUsers: Array.from(numJoinedUsers),
                    spaceCreateEvent: undefined,
                    latestCreatedChannels: undefined,
                }))

                setMembers(Array.from(stream.getMembers().membership.joinedUsers))

                await withAbort(
                    () => client.scrollbackToDate(stream, Date.now() - WEEK_MS),
                    abortController,
                )

                numJoinedUsers = getJoinedUsersAfterScrollback(stream.timeline)
                // space creation event
                const spaceCreateEvent = getSpaceCreatedEvent(stream.timeline)

                console.log('TownPageActivity numJoinedUsers last week', numJoinedUsers)
                setTownStats(() => ({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                    latestJoinedUsers: numJoinedUsers,
                    spaceCreateEvent: spaceCreateEvent,
                    latestCreatedChannels: undefined,
                }))

                const channelsIds = Array.from(stream.spaceContent.spaceChannelsMetadata.keys())
                const channelCreatedEvents: StreamTimelineEvent[] = []

                for (const channelId of channelsIds) {
                    const channelStats = await withAbort(
                        () => getChannelStats(client, channelId),
                        abortController,
                    )
                    if (!channelStats) {
                        return
                    }
                    channelCreatedEvents.concat(channelStats.channelInception)
                    setChannelStats((s) => {
                        const activeUsers = Array.from(
                            new Set<string>([...s.activeUsers, ...channelStats.activeUsers]),
                        )
                        return {
                            numMessages: s.numMessages + channelStats.numMessages,
                            numActiveUsers: activeUsers.length,
                            activeUsers,
                        }
                    })
                }

                setTownStats((currentStats) => {
                    if (!currentStats) {
                        return currentStats
                    }

                    return {
                        ...currentStats,
                        latestCreatedChannels: getLatestCreatedChannels(channelCreatedEvents),
                    }
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
        loginStatus,
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
    await client.scrollbackToDate(streamView, Date.now() - WEEK_MS)
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

function getJoinedUsersAfterScrollback(timeline: StreamTimelineEvent[]) {
    return timeline
        .flatMap((e) => (isRemoteEvent(e) ? e : undefined))
        .filter(notUndefined)
        .filter(
            (s) =>
                s?.remoteEvent.event.payload.value?.content.case === 'membership' &&
                s.remoteEvent.event.payload.value?.content.value?.op === MembershipOp.SO_JOIN,
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

        controllerIn.signal.addEventListener('abort', () => {
            controller.abort()
        })

        controller.signal.addEventListener('abort', () => {
            console.warn(`Aborting ${promise.toString()}`)
            reject(undefined)
        })

        promise().then(resolve).catch(reject)
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
