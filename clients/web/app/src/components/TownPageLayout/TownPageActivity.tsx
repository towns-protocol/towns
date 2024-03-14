import { MembershipOp } from '@river/proto'
import {
    StreamTimelineEvent,
    UnauthenticatedClient,
    isRemoteEvent,
    makeStreamRpcClient,
    userIdFromAddress,
} from '@river/sdk'
import { AnimatePresence, animate } from 'framer-motion'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useContractSpaceInfo } from 'use-towns-client'
import { useParams } from 'react-router'
import { Spinner } from '@components/Spinner'
import { FadeInBox } from '@components/Transitions'
import { Box, Icon, IconName, MotionBox, Paragraph, Stack, Text } from '@ui'
import { DAY_MS, WEEK_MS } from 'data/constants'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useDevice } from 'hooks/useDevice'
import { notUndefined, shortAddress } from 'ui/utils/utils'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'

export const Activity = (props: { townId: string }) => {
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
        !!townStats?.lastJoinedUserId &&
            activities.push({
                icon: 'member',
                title: `${shortAddress(townStats?.lastJoinedUserId)} 1w`,
                value: undefined,
                body: `Purchased membership and joined`,
            })
        !!townStats?.lastCreatedChannelInfo &&
            activities.push({
                icon: 'tag',
                title: `${shortAddress(townStats?.lastCreatedChannelInfo?.creatorUserId ?? '')} 1w`,
                value: undefined,
                body: `Created a new channel`,
            })
        !!townStats?.spaceCreatedAt &&
            activities.push({
                icon: 'key',
                title: `${shortAddress(spaceInfo?.owner ?? '')} 1w`,
                value: undefined,
                body: `Founded ${spaceInfo?.name}`,
            })
        return activities
    }, [channelStats, townStats, spaceInfo?.name, spaceInfo?.owner])

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

                    {activities.map((a) => (
                        <Stack
                            horizontal
                            gap
                            key={a.title + a.body}
                            alignItems="center"
                            paddingBottom="sm"
                        >
                            <Box centerContent width="x6" paddingBottom="sm">
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
        lastJoinedUserId: string | undefined
        spaceCreatedAt: number | undefined
        lastCreatedChannelInfo:
            | {
                  creatorUserId: string
                  createdAt: number
              }
            | undefined
    }>()
    const rpcUrl = useEnvironment().casablancaUrl
    useEffect(() => {
        if (!rpcUrl) {
            return
        }
        // for hmr
        setChannelStats({
            numMessages: 0,
            numActiveUsers: 0,
            activeUsers: new Set<string>(),
        })

        setIsLoading(true)

        const fetch = async () => {
            try {
                const streamId = townId
                const rpcClient = makeStreamRpcClient(rpcUrl)
                const client = new UnauthenticatedClient(rpcClient)

                const stream = await client.getStream(streamId)

                setMembers(Array.from(stream.getMembers().membership.joinedUsers))

                await client.scrollbackToDate(stream, WEEK_MS)

                const numJoinedUsers = stream.timeline
                    .flatMap((e) => (isRemoteEvent(e) ? e : undefined))
                    .filter(notUndefined)
                    .filter(
                        (s) =>
                            s?.remoteEvent.event.payload.value?.content.case === 'membership' &&
                            s.remoteEvent.event.payload.value?.content.value?.op ===
                                MembershipOp.SO_JOIN,
                    )
                numJoinedUsers.sort(
                    (a, b) => Number(a.createdAtEpochMs) - Number(b.createdAtEpochMs),
                )

                // last joined user
                const lastJoinedUser = numJoinedUsers.at(-1)
                let lastJoinedUserId = undefined

                if (
                    lastJoinedUser?.remoteEvent.event.payload.value?.content.case === 'membership'
                ) {
                    lastJoinedUserId = userIdFromAddress(
                        lastJoinedUser.remoteEvent.event.payload.value.content.value.userAddress,
                    )
                }

                // space creation event
                const spaceInception = stream.timeline
                    .filter(
                        (x) =>
                            isRemoteEvent(x) &&
                            x.remoteEvent.event.payload.case === 'spacePayload' &&
                            x.remoteEvent.event.payload.value?.content.case === 'inception',
                    )
                    .at(0)

                let spaceCreatedAt = undefined

                if (
                    spaceInception?.remoteEvent?.event.payload.value?.content.case === 'inception'
                ) {
                    spaceCreatedAt = Number(spaceInception.createdAtEpochMs)
                }

                console.log('TownPageActivity numJoinedUsers last week', numJoinedUsers)
                setTownStats({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                    lastJoinedUserId: lastJoinedUserId,
                    spaceCreatedAt: spaceCreatedAt,
                    lastCreatedChannelInfo: undefined,
                })

                const channelsIds = Array.from(stream.spaceContent.spaceChannelsMetadata.keys())
                const channelCreatedEvents: StreamTimelineEvent[] = []

                for (const channelId of channelsIds) {
                    const streamView = await client.getStream(channelId)
                    await client.scrollbackToDate(streamView, WEEK_MS)
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
                const lastCreatedChannel = channelCreatedEvents.at(-1)
                if (lastCreatedChannel) {
                    setTownStats((currentStats) => {
                        if (!currentStats) {
                            return currentStats
                        }

                        return {
                            ...currentStats,
                            lastCreatedChannelInfo: {
                                creatorUserId: lastCreatedChannel.creatorUserId,
                                createdAt: Number(lastCreatedChannel.createdAtEpochMs),
                            },
                        }
                    })
                }

                setIsLoading(false)
            } catch (error) {
                console.error(error)
            }
        }

        fetch()
    }, [rpcUrl, townId])

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
