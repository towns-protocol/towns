import React from 'react'
import { useUserLookupContext } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { Box, Paragraph, Stack, Text } from '@ui'
import { ZRoomPropertiesEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { Avatar } from '@components/Avatar/Avatar'

export type Props = {
    event: ZRoomPropertiesEvent
    userId?: string
}

export const RoomProperties = (props: Props) => {
    const { usersMap } = useUserLookupContext()
    const { event, userId } = props
    const creator = event.sender.id
    const groupName = event.content.properties.name
    const creatorUser = usersMap[creator]
    const name = getPrettyDisplayName(creatorUser)

    if (!creatorUser) {
        return (
            <Stack centerContent paddingX="lg" paddingY="sm" color="gray2">
                {groupName} was created
            </Stack>
        )
    }

    const action = groupName ? (
        <>
            changed the group name to{' '}
            <Text display="inline" color="default">
                {groupName}
            </Text>
        </>
    ) : (
        'removed the group name'
    )

    const message =
        creator === userId ? (
            <Stack horizontal display="inline">
                You {action}
            </Stack>
        ) : (
            <Stack horizontal display="inline">
                <Link to={`profile/${creatorUser.userId}`}>
                    <Box display="inline" color="default">
                        {name}
                    </Box>
                </Link>{' '}
                {action}
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
