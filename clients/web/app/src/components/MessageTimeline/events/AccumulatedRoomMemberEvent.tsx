import React, { useMemo } from 'react'
import uniqBy from 'lodash/uniqBy'
import { useZionClient } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { AvatarStack, Paragraph, Stack } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { notUndefined } from 'ui/utils/utils'
import { AccumulatedRoomMemberRenderEvent } from '../util/getEventsByDate'

type Props = {
    event: AccumulatedRoomMemberRenderEvent
    channelName?: string
    channelEncrypted?: boolean
    userId?: string
}
export const AccumulatedRoomMemberEvent = (props: Props) => {
    const { event, channelName, userId, channelEncrypted: isChannelEncrypted } = props
    const { client } = useZionClient()
    const avatarUsers = useMemo(
        () =>
            uniqBy(
                event.events.map((e) => ({
                    avatarUrl: e.content.avatarUrl,
                    displayName: e.content.displayName,
                    userId: e.content.userId,
                })),
                (e) => e.userId,
            )
                .filter(({ userId: _userId }) => userId !== _userId)
                .map((e) => {
                    // e.content.avatarUrl contains outdated avatarUrl in the case user has changed their avatar
                    const _user = client?.getUser(e.userId)
                    return {
                        ...e,
                        avatarUrl: _user?.avatarUrl,
                    }
                }),
        [client, event.events, userId],
    )

    const message = useMemo(() => {
        const includesUser = event.events.some((e) => e.content.userId === userId)
        const verb = `${event.membershipType === 'join' ? 'joined' : 'left'} #${channelName}${
            includesUser && isChannelEncrypted ? ', an end-to-end encrypted channel' : ''
        }`
        const names = getNameListFromArray(
            event.events
                .map((e, index) => {
                    if (e.content.userId === userId) {
                        return index === 0 ? 'You' : 'you'
                    }
                    return (
                        <Link key={e.content.userId} to={`profile/${e.content.userId}`}>
                            {e.content.displayName}
                        </Link>
                    )
                })
                .filter(notUndefined),
            verb,
        )
        return names
    }, [channelName, event.events, event.membershipType, isChannelEncrypted, userId])

    return (
        <Stack centerContent horizontal gap="sm" paddingX="lg" paddingY="md" color="gray2">
            <AvatarStack users={avatarUsers} size="avatar_xs" />
            <Paragraph>{message}</Paragraph>
        </Stack>
    )
}

const getNameListFromArray = (names: React.ReactNode[], verb: string, maxLength = 3) => {
    if (!names.length) {
        return ''
    }

    if (maxLength > 1 && names.length > maxLength) {
        names.splice(maxLength - 1, names.length, 'others')
    }

    const str = (
        <>
            {names[0]}
            <>{` ${verb}`}</>
        </>
    )

    if (names.length === 1) {
        return str
    } else if (names.length === 2) {
        return (
            <>
                {str} along with {names[1]}
            </>
        )
    }

    return (
        <>
            {str} along with{' '}
            <span className={atoms({ color: 'default' })}>{names.length - 1} others</span>
        </>
    )
}
