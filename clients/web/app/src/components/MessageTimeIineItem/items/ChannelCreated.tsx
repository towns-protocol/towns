import React from 'react'
import { useMyProfile, useUserLookupContext } from 'use-zion-client'
import { Paragraph, Stack } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ZRoomCreateEvent } from '../../MessageTimeline/util/getEventsByDate'

export const TimelineChannelCreateEvent = (props: {
    event: ZRoomCreateEvent
    channelName?: string
}) => {
    const { event, channelName } = props
    const { usersMap } = useUserLookupContext()
    const user = useMyProfile()
    const creator = usersMap[event.content.creator]

    const name = creator
        ? creator.userId === user?.userId
            ? 'You'
            : getPrettyDisplayName(creator)
        : ''

    return (
        <Stack centerContent>
            <Paragraph color="gray2">
                {name} created {channelName ? `#${channelName}` : `channel`}
            </Paragraph>
        </Stack>
    )
}
