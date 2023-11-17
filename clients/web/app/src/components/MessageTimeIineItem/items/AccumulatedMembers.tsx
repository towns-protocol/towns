import React, { useMemo } from 'react'
import uniqBy from 'lodash/uniqBy'
import { Link } from 'react-router-dom'
import { firstBy } from 'thenby'
import { Membership, useAllKnownUsers } from 'use-zion-client'
import { Card, Paragraph, Stack, TooltipRenderer } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { AvatarStack } from 'routes/AvatarStack'
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
    [Membership.Invite]: 'was invited',
} as const

export const AccumulatedRoomMemberEvent = (props: Props) => {
    const { usersMap } = useAllKnownUsers()
    const { event, channelName, userId, channelEncrypted: isChannelEncrypted } = props
    const avatarUsers = useMemo(
        () =>
            uniqBy(
                event.events.map((e) => ({
                    displayName: e.content.displayName,
                    userId: e.content.userId,
                })),
                (e) => e.userId,
            ).filter(({ userId: _userId }) => userId !== _userId),
        [event.events, userId],
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
                            {
                                getPrettyDisplayName(
                                    usersMap[e.content.userId] ?? {
                                        userId: e.content.userId,
                                        displayName: e.content.displayName ?? '',
                                    },
                                ).displayName
                            }
                        </Link>
                    )
                })
                .filter(notUndefined),
            verb,
        )
        return names
    }, [channelName, event.events, event.membershipType, isChannelEncrypted, userId, usersMap])

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
            <TooltipRenderer tooltip={<UserListTooltip names={originalNames.slice(1)} />}>
                {({ triggerProps }) => (
                    <span className={atoms({ color: 'default' })} {...triggerProps}>
                        {originalNames.length - 1} others
                    </span>
                )}
            </TooltipRenderer>
        </>
    )
}

const UserListTooltip = (props: { names: (React.ReactNode | string | undefined)[] }) => {
    return (
        <Card padding border gap="xs" background="level2" rounded="sm">
            {props.names}
        </Card>
    )
}
