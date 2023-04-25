import React from 'react'
import { useMyProfile, useSpaceMembers } from 'use-zion-client'
import { Paragraph, Stack } from '@ui'
import { ZRoomCreateEvent } from '../../MessageTimeline/util/getEventsByDate'

export const TimelineChannelCreateEvent = (props: {
    event: ZRoomCreateEvent
    channelName?: string
}) => {
    const { event, channelName } = props
    const { membersMap } = useSpaceMembers()
    const user = useMyProfile()
    const creator = membersMap[event.content.creator]
    const name = creator ? (creator.userId === user?.userId ? 'You' : creator.name) : ''

    return (
        <Stack centerContent paddingY="md">
            <Paragraph color="gray2">
                {name} created {channelName ? `#${channelName}` : `channel`}
            </Paragraph>
        </Stack>
    )
}
