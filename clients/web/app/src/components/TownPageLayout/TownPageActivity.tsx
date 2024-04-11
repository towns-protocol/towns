import { MembershipOp } from '@river-build/proto'
import {
    StreamTimelineEvent,
    UnauthenticatedClient,
    isDefined,
    isRemoteEvent,
    makeRiverRpcClient,
    userIdFromAddress,
} from '@river/sdk'
import { AnimatePresence, animate } from 'framer-motion'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { makeProviderFromConfig, useContractSpaceInfo } from 'use-towns-client'
import { useParams } from 'react-router'
import { Spinner } from '@components/Spinner'
import { FadeInBox } from '@components/Transitions'
import { Box, Icon, IconName, MotionBox, Paragraph, Stack, Text } from '@ui'
import { DAY_MS, WEEK_MS } from 'data/constants'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useDevice } from 'hooks/useDevice'
import { notUndefined, shortAddress } from 'ui/utils/utils'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'

export const TownPageActivity = (props: { townId: string }) => {
    const { members, townStats, channelStats, isLoading } = useFetchUnauthenticatedActivity(
        props.townId,
    )
    const { spaceSlug } = useParams()
    const { data: spaceInfo } = useContractSpaceInfo(spaceSlug)

    const activities = useMemo(() => {
        const activities: {
            title: string
            value: number | undefined
            body: string
            icon?: IconName
        }[] = []

        const memberAndChannelActivities = [
            ...(townStats?.latestJoinedUsers || []).map((event) => ({
                ...event,
                icon: 'member' as IconName,
                type: event.type,
                body: `Purchased membership and joined`,
            })),
            ...(townStats?.latestCreatedChannels || []).map((event) => ({
                ...event,
                icon: 'tag' as IconName,
                type: event.type,
                body: `Created a new channel`,
            })),
        ]

        !!channelStats?.numMessages &&
            activities.push({
                icon: 'messageVariant',
                title: 'In the past 24h',
                value: channelStats?.numMessages,
                body: `new message${channelStats?.numMessages > 1 ? 's' : ''} were sent`,
            })

        !!channelStats?.numActiveUsers &&
            activities.push({
                icon: 'sun',
                title: 'In the past 24h',
                value: channelStats?.numActiveUsers,
                body: `${
                    channelStats.numActiveUsers > 1 ? 'people were' : 'member was'
                } active in the town`,
            })

        !!townStats?.numJoinedUsers &&
            activities.push({
                icon: 'treasury',
                title: 'In the past week',
                value: townStats?.numJoinedUsers,
                body: `new member${townStats?.numJoinedUsers > 1 ? 's' : ''} joined`,
            })
        memberAndChannelActivities
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach((activity) => {
                if (!activity.userId.includes('cA3')) {
                    activities.push({
                        icon: activity.icon,
                        title: `${shortAddress(activity.userId)} ${formatRelativeTime(
                            activity.timestamp,
                        )}`,
                        value: undefined,
                        body: activity.body,
                    })
                }
            })
        !!townStats?.spaceCreateEvent &&
            activities.push({
                icon: 'key',
                title: `${shortAddress(townStats.spaceCreateEvent.userId)} ${formatRelativeTime(
                    townStats.spaceCreateEvent.timestamp,
                )}`,
                value: undefined,
                body: `Founded ${spaceInfo?.name}`,
            })
        return activities
    }, [channelStats, townStats, spaceInfo?.name])

    const { isTouch } = useDevice()
    const maxMembers = isTouch ? 7 : 10

    return (
        <AnimatePresence>
            <Stack gap="lg">
                {!!members && members.length > 0 && (
                    <FadeInBox
                        horizontal
                        gap="md"
                        maxWidth={{ mobile: '100%', default: '600' }}
                        key="members"
                    >
                        <Stack gap="md">
                            <Text strong size="md">
                                {members.length} {members.length === 1 ? 'Member' : 'Members'}
                            </Text>
                            <Stack horizontal gap="sm">
                                {members.slice(0, maxMembers).map((m) => (
                                    <AvatarWithoutDot key={m} userId={m} size="avatar_x4" />
                                ))}
                                {members.length > maxMembers && (
                                    <Box
                                        centerContent
                                        width="x4"
                                        height="x4"
                                        background="hover"
                                        rounded="full"
                                    >
                                        <Text strong size="xs" color="default">
                                            +{members.length - maxMembers}
                                        </Text>
                                    </Box>
                                )}
                            </Stack>
                        </Stack>
                    </FadeInBox>
                )}

                <MotionBox gap="md" key="activities" layout="position">
                    <Stack horizontal gap alignItems="center">
                        <Text strong size="md">
                            Activity
                        </Text>
                        {isLoading && <Spinner height="height_sm" />}
                    </Stack>

                    {activities.map((a, i) => (
                        <Stack
                            horizontal
                            gap
                            key={a.title + a.body + `${i}`}
                            alignItems="center"
                            paddingBottom="sm"
                        >
                            <Box centerContent width="x6" shrink={false}>
                                {a.icon && <Icon type={a.icon} size="square_md" color="gray2" />}
                            </Box>
                            <Box grow gap="paragraph">
                                <Paragraph size="md" color="gray2">
                                    {a.title}
                                </Paragraph>
                                <Text fontSize={isTouch ? 'md' : 'lg'} color="gray1">
                                    {a.value !== undefined && <Counter value={a.value} />} {a.body}
                                </Text>
                            </Box>
                        </Stack>
                    ))}
                </MotionBox>
            </Stack>
        </AnimatePresence>
    )
}

const Counter = (props: { value: number }) => {
    const ref = useRef<HTMLSpanElement>(null)
    const refValue = useRef(0)

    const to = props.value

    useEffect(() => {
        const controls = animate(refValue.current, to, {
            onUpdate(value) {
                if (ref.current) {
                    refValue.current = value
                    ref.current.textContent = Math.floor(value).toString()
                }
            },
        })
        return () => controls.stop()
    }, [to])
    return <span ref={ref} />
}

type ActivityEvent = {
    userId: string
    timestamp: number
    type: 'joinedUser' | 'createChannel' | 'createSpace'
}

const useFetchUnauthenticatedActivity = (townId: string) => {
    const [isLoading, setIsLoading] = useState(true)
    const [members, setMembers] = useState<string[]>([])
    const [channelStats, setChannelStats] = useState({
        numMessages: 0,
        numActiveUsers: 0,
        activeUsers: new Set<string>(),
    })
    const [townStats, setTownStats] = useState<{
        numJoinedUsers: number
        latestJoinedUsers: ActivityEvent[] | undefined
        spaceCreateEvent: ActivityEvent | undefined
        latestCreatedChannels: ActivityEvent[] | undefined
    }>()

    const { riverChainConfig, riverChain } = useEnvironment()
    useEffect(() => {
        if (!riverChainConfig) {
            return
        }
        const provider = makeProviderFromConfig(riverChain)
        let client: UnauthenticatedClient | undefined = undefined
        // for hmr
        setChannelStats({
            numMessages: 0,
            numActiveUsers: 0,
            activeUsers: new Set<string>(),
        })

        setIsLoading(true)

        const fetch = async () => {
            try {
                console.log('TownPageActivity fetch space', townId)
                const streamId = townId
                if (!client) {
                    const rpcClient = await makeRiverRpcClient(provider, riverChainConfig)
                    client = new UnauthenticatedClient(rpcClient)
                }

                const stream = await client.getStream(streamId)

                let numJoinedUsers = Array.from(stream.getMembers().joined.values()).map((m) => {
                    return {
                        userId: m.userId,
                        timestamp: 0,
                        type: 'joinedUser',
                    } as ActivityEvent
                })

                setTownStats({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                    latestJoinedUsers: Array.from(numJoinedUsers),
                    spaceCreateEvent: undefined,
                    latestCreatedChannels: undefined,
                })

                setMembers(Array.from(stream.getMembers().membership.joinedUsers))

                await client.scrollbackToDate(stream, Date.now() - WEEK_MS)

                numJoinedUsers = stream.timeline
                    .flatMap((e) => (isRemoteEvent(e) ? e : undefined))
                    .filter(notUndefined)
                    .filter(
                        (s) =>
                            s?.remoteEvent.event.payload.value?.content.case === 'membership' &&
                            s.remoteEvent.event.payload.value?.content.value?.op ===
                                MembershipOp.SO_JOIN,
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

                // space creation event
                const spaceInception = stream.timeline
                    .filter(
                        (x) =>
                            isRemoteEvent(x) &&
                            x.remoteEvent.event.payload.case === 'spacePayload' &&
                            x.remoteEvent.event.payload.value?.content.case === 'inception',
                    )
                    .at(0)

                let spaceCreateEvent: ActivityEvent | undefined = undefined

                if (
                    spaceInception?.remoteEvent?.event.payload.value?.content.case === 'inception'
                ) {
                    const userId = userIdFromAddress(
                        spaceInception.remoteEvent.event.creatorAddress,
                    )
                    spaceCreateEvent = {
                        userId: userId,
                        timestamp: Number(spaceInception.createdAtEpochMs),
                        type: 'createSpace',
                    }
                }

                console.log('TownPageActivity numJoinedUsers last week', numJoinedUsers)
                setTownStats({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                    latestJoinedUsers: numJoinedUsers,
                    spaceCreateEvent: spaceCreateEvent,
                    latestCreatedChannels: undefined,
                })

                const channelsIds = Array.from(stream.spaceContent.spaceChannelsMetadata.keys())
                const channelCreatedEvents: StreamTimelineEvent[] = []

                for (const channelId of channelsIds) {
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
                    channelCreatedEvents.push(...channelInception)

                    const messages = channelMessages.filter((f) =>
                        isWithin(f.createdAtEpochMs, DAY_MS),
                    )

                    setChannelStats((s) => {
                        const activeUsers = channelMessages
                            .filter((f) => isWithin(f.createdAtEpochMs, DAY_MS))
                            .reduce((acc, curr) => {
                                acc.add(curr.creatorUserId)
                                return acc
                            }, s.activeUsers)

                        return {
                            numMessages: s.numMessages + messages.length,
                            numActiveUsers: Array.from(activeUsers).length,
                            activeUsers,
                        }
                    })
                }

                channelCreatedEvents.sort(
                    (a, b) => Number(a.createdAtEpochMs) - Number(b.createdAtEpochMs),
                )
                const latestCreatedChannels = channelCreatedEvents.map(
                    (event) =>
                        ({
                            userId: event.creatorUserId,
                            timestamp: Number(event.createdAtEpochMs),
                            type: 'createChannel',
                        } as ActivityEvent),
                )

                setTownStats((currentStats) => {
                    if (!currentStats) {
                        return currentStats
                    }

                    return {
                        ...currentStats,
                        latestCreatedChannels: latestCreatedChannels,
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
        }
    }, [riverChain, riverChainConfig, townId])

    return {
        isLoading,
        townStats,
        channelStats,
        members,
    }
}

function isWithin(number: number | bigint, time: number) {
    const minEpochMs = Date.now() - time
    return number > minEpochMs
}

function formatRelativeTime(timestamp: number) {
    const secondsAgo = (Date.now() - timestamp) / 1000
    if (secondsAgo < 60) {
        return 'just now'
    }
    const minutesAgo = secondsAgo / 60
    if (minutesAgo < 60) {
        return `${Math.floor(minutesAgo)}m`
    }
    const hoursAgo = minutesAgo / 60
    if (hoursAgo < 24) {
        return `${Math.floor(hoursAgo)}h`
    }
    const daysAgo = hoursAgo / 24
    if (daysAgo < 7) {
        return `${Math.floor(daysAgo)}d`
    }
    const weeksAgo = daysAgo / 7
    return `${Math.floor(weeksAgo)}w`
}
