import { AnimatePresence, animate } from 'framer-motion'
import React, { useEffect, useMemo, useRef } from 'react'
import { useContractSpaceInfo } from 'use-towns-client'
import { Spinner } from '@components/Spinner'
import { FadeInBox } from '@components/Transitions'
import { Box, Icon, IconName, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { shortAddress } from 'ui/utils/utils'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useFetchUnauthenticatedActivity } from './useFetchUnauthenticatedActivity'

export const TownPageActivity = (props: { townId: string }) => {
    const { members, townStats, channelStats, isLoading } = useFetchUnauthenticatedActivity(
        props.townId,
    )
    const spaceId = useSpaceIdFromPathname()
    const { data: spaceInfo } = useContractSpaceInfo(spaceId)

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

                <Box gap="md" key="activities">
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
                </Box>
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
