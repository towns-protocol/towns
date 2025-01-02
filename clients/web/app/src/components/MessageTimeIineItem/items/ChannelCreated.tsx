import React from 'react'
import { useMyProfile, useUserLookupContext } from 'use-towns-client'
import { Paragraph, Stack } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ZInceptionEvent } from '../../MessageTimeline/util/getEventsByDate'

export const TimelineChannelCreateEvent = (props: {
    event: ZInceptionEvent
    channelName?: string
}) => {
    const { event, channelName } = props
    const { lookupUser } = useUserLookupContext()
    const user = useMyProfile()
    const creator = lookupUser(event.content.creatorId)

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
