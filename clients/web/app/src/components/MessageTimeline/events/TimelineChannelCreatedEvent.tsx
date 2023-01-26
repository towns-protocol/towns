import React from 'react'
import { useSpaceMembers } from 'use-zion-client'
import { Paragraph, Stack } from '@ui'
import { ZRoomCreateEvent } from '../util/getEventsByDate'

export const TimelineChannelCreateEvent = (props: {
    event: ZRoomCreateEvent
    channelName?: string
}) => {
    const { event, channelName } = props
    const { membersMap } = useSpaceMembers()
    const creator = membersMap[event.content.creator]

    return (
        <Stack centerContent paddingY="md">
            <Paragraph color="gray2">
                {channelName ? `#${channelName}` : `channel`} created
                {creator ? ` by ${creator.name}` : ``}
            </Paragraph>
        </Stack>
    )
}
