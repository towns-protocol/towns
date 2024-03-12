import React, { useMemo } from 'react'
import uniqBy from 'lodash/uniqBy'
import { Link } from 'react-router-dom'
import { firstBy } from 'thenby'
import { Membership, useUserLookupContext } from 'use-towns-client'
import { Box, Paragraph, Stack, Tooltip } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { AvatarStack } from 'routes/AvatarStack'
import { getNameListFromUsers } from '@components/UserList/UserList'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { AccumulatedRoomMemberRenderEvent } from '../../MessageTimeline/util/getEventsByDate'

type Props = {
    event: AccumulatedRoomMemberRenderEvent
    channelName?: string
    channelEncrypted?: boolean
    userId?: string
}

const Verbs = {
    [Membership.Join]: 'joined',
    [Membership.Leave]: 'left',
    [Membership.Invite]: 'received an invitation to join',
} as const

export const AccumulatedRoomMemberEvent = (props: Props) => {
    const { usersMap } = useUserLookupContext()
    const { event, channelName, userId, channelEncrypted: isChannelEncrypted } = props

    const isAddedEvent = event.membershipType === Membership.Invite

    const avatarUsers = useMemo(
        () =>
            uniqBy(
                event.events.map((e) => ({
                    displayName: e.content.displayName,
                    userId: e.content.userId,
                })),
                (e) => e.userId,
            ).filter(({ userId: _userId }) => isAddedEvent || userId !== _userId),
        [event.events, isAddedEvent, userId],
    )

    const message = useMemo(() => {
        const includesUser = event.events.some((e) => e.content.userId === userId)

        if (
            event.membershipType !== Membership.Join &&
            event.membershipType !== Membership.Leave &&
            event.membershipType !== Membership.Invite
        ) {
            return
        }

        // in GDMs we display 'X added Y,Z and others' instead of invites and joins
        if (isAddedEvent) {
            const senderId = event.events[0]?.sender.id
            const sender = usersMap[senderId]

            const senderDisplayName = senderId === userId ? 'You' : getPrettyDisplayName(sender)

            const users = event.events.map((e) => usersMap[e.content.userId])
            const list = getNameListFromUsers(users, userId)
            return `${senderDisplayName} added ${list}`
        }

        const verb = channelName
            ? `${Verbs[event.membershipType]} #${channelName}${
                  includesUser && isChannelEncrypted ? ', an end-to-end encrypted channel' : ''
              }`
            : // chats
              `${Verbs[event.membershipType]}`

        const names = getNameListFromArray(
            event.events
                .slice()
                .sort(firstBy((e) => e.content.userId === userId, -1))
                .map((e, index) => {
                    if (e.content.userId === userId) {
                        return index === 0 ? 'You' : 'you'
                    }
                    return (
                        <Link key={e.content.userId} to={`profile/${e.content.userId}`}>
                            <Box
                                color="default"
                                display="inline"
                                tooltip={<ProfileHoverCard userId={e.content.userId} />}
                            >
                                {getPrettyDisplayName(
                                    usersMap[e.content.userId] ?? {
                                        userId: e.content.userId,
                                        displayName: e.content.displayName ?? '',
                                    },
                                )}
                            </Box>
                        </Link>
                    )
                })
                .filter(notUndefined),
            verb,
        )
        return names
    }, [
        channelName,
        event.events,
        event.membershipType,
        isAddedEvent,
        isChannelEncrypted,
        userId,
        usersMap,
    ])

    return (
        <Stack
            centerContent
            direction={{ default: 'row', mobile: 'column' }}
            gap="sm"
            paddingX="lg"
            paddingY="sm"
            color="gray2"
        >
            <AvatarStack users={avatarUsers} size="avatar_xs" />
            <Paragraph textAlign={{ mobile: 'center' }}>{message}</Paragraph>
        </Stack>
    )
}

const getNameListFromArray = (names: React.ReactNode[], verb: string, maxLength = 3) => {
    if (!names.length) {
        return ''
    }

    const originalNames = [...names]

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
            <Stack
                tooltip={<Tooltip>{originalNames.slice(1)}</Tooltip>}
                display="inline"
                cursor="pointer"
                color="default"
            >
                {originalNames.length - 1} others
            </Stack>
        </>
    )
}
