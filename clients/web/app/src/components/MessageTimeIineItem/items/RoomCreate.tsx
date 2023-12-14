import React from 'react'
import { Link } from 'react-router-dom'
import { useUserLookupContext } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, Paragraph, Stack } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { ZRoomCreateEvent } from '../../MessageTimeline/util/getEventsByDate'

type Props = {
    event: ZRoomCreateEvent
    channelName?: string
    channelEncrypted?: boolean
    userId?: string
}

export const RoomCreate = (props: Props) => {
    const { usersMap } = useUserLookupContext()
    const { event, channelName, userId } = props

    const creator = event.content.creator

    const creatorUser = usersMap[creator]
    const name = getPrettyDisplayName(creatorUser).displayName
    const groupName = channelName ? `#${channelName}` : `this group`

    if (!creatorUser) {
        return (
            <Stack centerContent paddingX="lg" paddingY="sm" color="gray2">
                {groupName} was created
            </Stack>
        )
    }
    const message =
        creator === userId ? (
            `You created ${groupName}`
        ) : (
            <Stack display="inline">
                <Link to={`profile/${creatorUser.userId}`}>
                    <Box display="inline" color="default">
                        {name}
                    </Box>
                </Link>
                {` created ${groupName}`}
            </Stack>
        )

    return (
        <Stack centerContent paddingX="lg" paddingY="sm" color="gray2">
            <Stack
                centerContent
                direction={{ default: 'row', mobile: 'column' }}
                gap="sm"
                tooltip={<ProfileHoverCard userId={creator} />}
            >
                <Avatar userId={creator} size="avatar_xs" />
                <Paragraph textAlign={{ mobile: 'center' }}>{message}</Paragraph>
            </Stack>
        </Stack>
    )
}
