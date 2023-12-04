import { MembershipOp } from '@river/proto'
import {
    RemoteTimelineEvent,
    UnauthenticatedClient,
    isRemoteEvent,
    makeStreamRpcClient,
} from '@river/sdk'
import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@components/Spinner'
import { FadeInBox } from '@components/Transitions'
import { Box, Heading, Icon, IconName, Paragraph, Stack, Text } from '@ui'
import { DAY_MS, WEEK_MS } from 'data/constants'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useDevice } from 'hooks/useDevice'
import { notUndefined } from 'ui/utils/utils'
import { Avatar } from '@components/Avatar/Avatar'

export const Activity = (props: { townId: string }) => {
    const { members, townStats, channelStats, isLoading } = useFetchUnauthenticatedActivity(
        props.townId,
    )

    const activities = useMemo(() => {
        const activities: { title: string; body: string; icon?: IconName }[] = []

        !!channelStats?.numMessages &&
            activities.push({
                icon: 'messageVariant',
                title: 'In the past 24h',
                body: `${channelStats?.numMessages} new message${
                    channelStats?.numMessages > 1 ? 's' : ''
                } were sent`,
            })

        !!channelStats?.numActiveUsers &&
            activities.push({
                icon: 'sun',
                title: 'In the past 24h',
                body: `${channelStats?.numActiveUsers} ${
                    channelStats.numActiveUsers > 1 ? 'people were' : 'member was'
                } active in the town`,
            })

        !!townStats?.numJoinedUsers &&
            activities.push({
                icon: 'treasury',
                title: 'In the past week',
                body: `${townStats?.numJoinedUsers} new member${
                    townStats?.numJoinedUsers > 1 ? 's' : ''
                } joined`,
            })

        return activities
    }, [channelStats, townStats])

    const { isTouch } = useDevice()

    return (
        <AnimatePresence>
            {!!members && (
                <FadeInBox
                    horizontal
                    gap="sm"
                    style={{ flexWrap: 'wrap' }}
                    maxWidth={{ mobile: '100%', default: '600' }}
                    key="members"
                >
                    {members.map((m) => (
                        <Avatar key={m} userId={m} size="avatar_x4" />
                    ))}
                </FadeInBox>
            )}

            <Box gap="lg" key="activities">
                <Stack horizontal gap alignItems="center">
                    <Heading level={3}>Activity</Heading>
                    {isLoading && <Spinner width="height_sm" display="inline-block" />}
                </Stack>

                {activities.map((a) => (
                    <Stack horizontal gap key={a.title + a.body} alignItems="center">
                        <Box centerContent width="x6" padding="sm">
                            {a.icon && <Icon type={a.icon} size="square_md" color="gray2" />}
                        </Box>
                        <Box grow gap="paragraph">
                            <Paragraph size="md" color="gray2">
                                {a.title}
                            </Paragraph>
                            <Text fontSize={isTouch ? 'md' : 'lg'} color="gray1">
                                {a.body}
                            </Text>
                        </Box>
                    </Stack>
                ))}
            </Box>
        </AnimatePresence>
    )
}

const useFetchUnauthenticatedActivity = (townId: string) => {
    const [isLoading, setIsLoading] = useState(true)
    const [members, setMembers] = useState<string[]>([])
    const [channelStats, setChannelStats] = useState<{
        numMessages: number
        numActiveUsers: number
    }>()
    const [townStats, setTownStats] = useState<{ numJoinedUsers: number }>()
    const rpcUrl = useEnvironment().casablancaUrl
    useEffect(() => {
        if (!rpcUrl) {
            return
        }
        const fetch = async () => {
            try {
                const streamId = townId
                const rpcClient = makeStreamRpcClient(rpcUrl)
                const client = new UnauthenticatedClient(rpcClient)
                const stream = await client.getStream(streamId)
                const { spaceContent, timeline: spaceTimeline } = stream

                setMembers(Array.from(spaceContent.memberships.joinedUsers))
                const remoteEvents: RemoteTimelineEvent[] = spaceTimeline
                    .flatMap((e) => (isRemoteEvent(e) ? e : undefined))
                    .filter(notUndefined)
                const numJoinedUsers = remoteEvents
                    .filter((s) => isWithin(s.createdAtEpocMs, WEEK_MS))
                    .filter(
                        (s) =>
                            s.remoteEvent.event.payload.value?.content.case === 'membership' &&
                            s.remoteEvent.event.payload.value?.content.value?.op ===
                                MembershipOp.SO_JOIN,
                    )

                    .reduce((acc, s) => acc.add(s!.creatorUserId), new Set())

                setTownStats({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                })

                // just for testing, don't bother iterate all channels yet
                const firstChannelId = Array.from(spaceContent.spaceChannelsMetadata.keys()).at(0)

                if (firstChannelId) {
                    const streamView = await client.getStream(firstChannelId)
                    const channelMessages = streamView.timeline.filter(
                        (x) =>
                            isRemoteEvent(x) &&
                            x.remoteEvent.event.payload.case === 'channelPayload' &&
                            x.remoteEvent.event.payload.value?.content.case === 'message',
                    )

                    const messages = channelMessages.filter((f) =>
                        isWithin(f.createdAtEpocMs, DAY_MS),
                    )

                    const activeUsers = channelMessages
                        .filter((f) => isWithin(f.createdAtEpocMs, DAY_MS))
                        .reduce((acc, curr) => {
                            acc.add(curr.creatorUserId)
                            return acc
                        }, new Set())

                    setChannelStats({
                        numMessages: messages.length,
                        numActiveUsers: Array.from(activeUsers).length,
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
