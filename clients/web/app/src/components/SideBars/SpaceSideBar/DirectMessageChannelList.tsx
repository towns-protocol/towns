import React, { useMemo } from 'react'
import {
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useDMLatestMessage,
    useMyUserId,
    useSpaceMembers,
    useZionContext,
} from 'use-zion-client'
import {
    DirectMessageIcon,
    DirectMessageName,
} from '@components/DirectMessages/DirectMessageListItem'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { Badge, Box, IconButton } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { SidebarListLayout } from './SidebarListLayout'

export const useSpaceDms = () => {
    const { dmChannels, dmUnreadChannelIds } = useZionContext()
    const { memberIds } = useSpaceMembers()
    const spaceDms = useMemo(
        () => dmChannels.filter((c) => !c.left && c.userIds.every((m) => memberIds.includes(m))),
        [dmChannels, memberIds],
    )
    return { spaceDms, dmUnreadChannelIds }
}

export const DirectMessageChannelList = (props: { onDisplayCreate: () => void }) => {
    const { spaceDms, dmUnreadChannelIds } = useSpaceDms()
    return (
        <SidebarListLayout
            label="Direct Messages"
            headerContent={
                <IconButton
                    size="square_sm"
                    icon="compose"
                    color="gray2"
                    cursor="pointer"
                    onClick={props.onDisplayCreate}
                />
            }
            channels={spaceDms}
            itemRenderer={(c) => (
                <CondensedChannelNavItem channel={c} unread={dmUnreadChannelIds.has(c.id)} />
            )}
        />
    )
}

const CondensedChannelNavItem = (props: { channel: DMChannelIdentifier; unread: boolean }) => {
    const { channel, unread } = props
    const { createLink } = useCreateLink()
    const link = useMemo(() => createLink({ messageId: channel.id }), [createLink, channel.id])

    const { unreadCount } = useDMLatestMessage(channel.id)
    const myUserId = useMyUserId()
    return (
        <DMChannelContextUserLookupProvider
            fallbackToParentContext
            key={channel.id}
            channelId={channel.id}
        >
            <ActionNavItem
                badge={unread && <Badge value={unreadCount} />}
                key={channel.id}
                icon={
                    <Box width="x4" shrink={false}>
                        <DirectMessageIcon channel={channel} width="x4" myUserId={myUserId} />
                    </Box>
                }
                id={channel.id}
                label={<DirectMessageName channel={channel} />}
                highlight={unread}
                link={link}
                minHeight="x5"
            />
        </DMChannelContextUserLookupProvider>
    )
}
