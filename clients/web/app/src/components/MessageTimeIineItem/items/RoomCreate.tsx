import React from 'react'
import { useAllKnownUsers } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Paragraph, Stack } from '@ui'
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
    const { usersMap } = useAllKnownUsers()
    const { event, channelName, userId } = props

    const creator = event.content.creator

    const name = getPrettyDisplayName(usersMap[creator]).displayName
    const groupName = channelName ? `#${channelName}` : `this group`

    const message = creator === userId ? `You created ${groupName}` : `${name} created ${groupName}`

    return (
        <Stack centerContent paddingX="lg" paddingY="md" color="gray2">
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
