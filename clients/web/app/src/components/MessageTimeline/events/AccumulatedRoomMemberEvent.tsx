import React, { useMemo } from 'react'
import uniqBy from 'lodash/uniqBy'
import { AvatarStack, Paragraph, Stack } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { notUndefined } from 'ui/utils/utils'
import { AccumulatedRoomMemberRenderEvent } from '../util/getEventsByDate'

type Props = {
    event: AccumulatedRoomMemberRenderEvent
    channelName?: string
    userId?: string
}
export const AccumulatedRoomMemberEvent = (props: Props) => {
    const { event, channelName, userId } = props
    const users = useMemo(
        () =>
            uniqBy(
                event.events.map((e) => ({
                    avatarUrl: e.content.avatarUrl,
                    displayName: e.content.displayName,
                    userId: e.content.userId,
                })),
                (e) => e.userId,
            ),
        [event.events],
    )

    const message = useMemo(() => {
        const verb = `${event.membershipType === 'join' ? 'joined' : 'left'} #${channelName}`
        const names = getNameListFromArray(
            event.events
                .map((e) => (e.content.userId === userId ? 'you' : e.content.displayName))
                .filter(notUndefined),
            verb,
        )
        return names
    }, [channelName, event.events, event.membershipType, userId])

    return (
        <Stack centerContent horizontal gap="sm" paddingX="lg" paddingY="md" color="gray2">
            <AvatarStack users={users} size="avatar_xs" />
            <Paragraph>{message}</Paragraph>
        </Stack>
    )
}

const getNameListFromArray = (names: string[], verb: string, maxLength = 3) => {
    // names = names.filter(Boolean)

    if (!names.length) {
        return ''
    }

    if (maxLength > 1 && names.length > maxLength) {
        names.splice(maxLength - 1, names.length, 'others')
    }

    const str = `${names[0]} ${verb}`

    if (names.length === 1) {
        return str
    } else if (names.length === 2) {
        return `${str} along with ${names[1]}`
    }

    return (
        <>
            {str} along with{' '}
            <span className={atoms({ color: 'default' })}>{names.length - 1} others</span>
        </>
    )
}
