import React, { useMemo } from 'react'
import {
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useDMLatestMessage,
    useMyUserId,
} from 'use-towns-client'
import {
    DirectMessageIcon,
    DirectMessageName,
} from '@components/DirectMessages/DirectMessageListItem'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { Badge, Box, Stack } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { FavoriteChannelButton } from '@components/FavoriteChannelButton/FavoriteChannelButton'

export const CondensedChannelNavItem = (props: {
    channel: DMChannelIdentifier
    unread: boolean
    favorite: boolean
    isUnreadSection?: boolean
}) => {
    const { channel, unread, favorite, isUnreadSection = false } = props

    const { createLink } = useCreateLink()
    const link = useMemo(() => createLink({ messageId: channel.id }), [createLink, channel.id])

    const { unreadCount } = useDMLatestMessage(channel.id)
    const myUserId = useMyUserId()
    return (
        <DMChannelContextUserLookupProvider key={channel.id} channelId={channel.id}>
            <ActionNavItem
                badge={
                    <Stack horizontal gap="sm">
                        <FavoriteChannelButton
                            channelId={channel.id}
                            favorite={favorite}
                            isUnreadSection={isUnreadSection}
                        />
                        {unread && <Badge value={unreadCount} />}
                    </Stack>
                }
                key={channel.id}
                icon={
                    <Box width="x4" shrink={false}>
                        <DirectMessageIcon channel={channel} width="x4" myUserId={myUserId} />
                    </Box>
                }
                id={channel.id}
                label={
                    <DirectMessageName channelId={channel.id} label={channel.properties?.name} />
                }
                highlight={unread}
                link={link}
                minHeight="x5"
            />
        </DMChannelContextUserLookupProvider>
    )
}
