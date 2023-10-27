import { MembershipOp } from '@river/proto'
import { UnauthenticatedClient, makeStreamRpcClient } from '@river/sdk'
import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@components/Spinner'
import { FadeInBox } from '@components/Transitions'
import { Avatar, Box, Heading, Icon, IconName, Paragraph, Stack } from '@ui'
import { DAY_MS, WEEK_MS } from 'data/constants'
import { env } from 'utils'

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
                <Heading level={3}>Activity</Heading>

                {isLoading && <Spinner />}

                {activities.map((a) => (
                    <Stack horizontal gap key={a.title + a.body} alignItems="center">
                        <Box centerContent width="x6" padding="sm">
                            {a.icon && <Icon type={a.icon} size="square_md" color="gray2" />}
                        </Box>
                        <Box grow gap="paragraph">
                            <Paragraph size="md" color="gray2">
                                {a.title}
                            </Paragraph>
                            <Paragraph size="lg" color="gray1">
                                {a.body}
                            </Paragraph>
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

    useEffect(() => {
        const rpcUrl = env.VITE_CASABLANCA_HOMESERVER_URL
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

                const numJoinedUsers = spaceTimeline
                    .filter((s) => isWithin(s.event.createdAtEpocMs, WEEK_MS))
                    .filter(
                        (s) =>
                            s.event.payload.value?.content.case === 'membership' &&
                            s.event.payload.value?.content.value?.op === MembershipOp.SO_JOIN,
                    )
                    .reduce((acc, s) => acc.add(s.creatorUserId), new Set())

                setTownStats({
                    numJoinedUsers: Array.from(numJoinedUsers).length,
                })

                // just for testing, don't bother iterate all channels yet
                const firstChannelId = Array.from(spaceContent.spaceChannelsMetadata.keys()).at(0)

                if (firstChannelId) {
                    const { channelContent } = await client.getStream(firstChannelId)

                    const messages = Array.from(channelContent.messages.values()).filter((f) =>
                        isWithin(f.event.createdAtEpocMs, DAY_MS),
                    )

                    const activeUsers = Array.from(channelContent.messages.values())
                        .filter((f) => isWithin(f.event.createdAtEpocMs, DAY_MS))
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
    }, [townId])

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
