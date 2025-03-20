import React, { useMemo } from 'react'
import uniq from 'lodash/uniq'
import { useUserLookupContext } from 'use-towns-client'
import { Membership } from '@towns-protocol/sdk'
import { Paragraph, Stack, Tooltip } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { AvatarStack } from 'routes/AvatarStack'
import { UserList } from '@components/UserList/UserList'
import { useChannelType } from 'hooks/useChannelType'
import { UserWithTooltip } from '@components/ChannelIntro/UserWithTooltip'
import { AccumulatedStreamMemberRenderEvent } from '../../MessageTimeline/util/getEventsByDate'

type Props = {
    event: AccumulatedStreamMemberRenderEvent
    channelName?: string
    channelType?: ReturnType<typeof useChannelType>
    channelEncrypted?: boolean
    userId?: string
}

const Verbs = {
    [Membership.Join]: 'joined',
    [Membership.Leave]: 'left',
    [Membership.Invite]: 'received an invitation to join',
} as const

const MAX_AVATARS = 3

export const AccumulatedStreamMemberEvent = (props: Props) => {
    const { lookupUser } = useUserLookupContext()
    const { event, channelName, channelType, userId, channelEncrypted: isChannelEncrypted } = props
    const senderId = event.events[0]?.content?.initiatorId
    const eventUserId = event.events[0]?.content?.userId

    const isAddedEvent =
        event.membershipType === Membership.Invite ||
        (channelType === 'gdm' && event.membershipType === Membership.Join)

    const isGDMRemovedEvent =
        channelType === 'gdm' &&
        event.membershipType === Membership.Leave &&
        senderId !== eventUserId // If X leaves a GDM on their own, we show `X left`

    const allUserIds = useMemo(
        () =>
            uniq(event.events.map((e) => e.content.userId))
                .filter((u) => typeof u !== 'undefined')
                .sort((u) => (u === userId ? -1 : 0)),
        [event.events, userId],
    )

    const cappedUsers = allUserIds.slice(0, MAX_AVATARS)

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
        if (isAddedEvent || isGDMRemovedEvent) {
            const sender = lookupUser(senderId)
            const senderDisplayName = senderId === userId ? 'You' : getPrettyDisplayName(sender)

            return (
                <>
                    {senderDisplayName} {isGDMRemovedEvent ? 'removed ' : 'added '}
                    <UserList
                        excludeSelf
                        userIds={allUserIds.filter((u) => u !== senderId)}
                        myUserId={userId}
                        renderUser={(props) => (
                            <UserWithTooltip
                                userId={props.userId}
                                lookupUser={lookupUser}
                                key={props.userId}
                            />
                        )}
                    />
                </>
            )
        }

        let verb = channelName
            ? `${Verbs[event.membershipType]} #${channelName}${
                  includesUser && isChannelEncrypted ? ', an end-to-end encrypted channel' : ''
              }`
            : // chats
              `${Verbs[event.membershipType]}`

        if (channelType === 'gdm' && event.membershipType === Membership.Leave) {
            verb += ' this group'
        }

        const names = getNameListFromArray(
            allUserIds
                .map((u, index) => {
                    if (u === userId) {
                        return index === 0 ? 'You' : 'you'
                    }
                    return <UserWithTooltip key={u} userId={u} lookupUser={lookupUser} />
                })
                .filter(notUndefined),
            verb,
        )
        return names
    }, [
        allUserIds,
        channelName,
        channelType,
        event.events,
        event.membershipType,
        isAddedEvent,
        isChannelEncrypted,
        isGDMRemovedEvent,
        lookupUser,
        senderId,
        userId,
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
            <AvatarStack userIds={cappedUsers} size="avatar_xs" />
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
