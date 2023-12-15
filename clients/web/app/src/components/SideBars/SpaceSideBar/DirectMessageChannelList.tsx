import React, { useMemo } from 'react'
import {
    DMChannelIdentifier,
    useDMLatestMessage,
    useSpaceMembers,
    useZionContext,
} from 'use-zion-client'
import {
    DirectMessageIcon,
    DirectMessageName,
} from '@components/DirectMessages/DirectMessageListItem'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { Badge, Box } from '@ui'
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

export const DirectMessageChannelList = () => {
    const { spaceDms, dmUnreadChannelIds } = useSpaceDms()
    return (
        <SidebarListLayout
            label="Direct Messages"
            channels={spaceDms}
            itemRenderer={(c) => (
                <CondensedChannelNavItem channel={c} unread={dmUnreadChannelIds.has(c.id.slug)} />
            )}
        />
    )
}

const CondensedChannelNavItem = (props: { channel: DMChannelIdentifier; unread: boolean }) => {
    const { channel, unread } = props
    const { createLink } = useCreateLink()
    const { unreadCount } = useDMLatestMessage(channel.id)
    return (
        <ActionNavItem
            badge={unread && <Badge value={unreadCount} />}
            key={channel.id.slug}
            icon={
                <Box width="x4" shrink={false}>
                    <DirectMessageIcon channel={channel} width="x4" />
                </Box>
            }
            id={channel.id.slug}
            label={<DirectMessageName channel={channel} />}
            highlight={unread}
            link={createLink({ messageId: channel.id.slug })}
            minHeight="x5"
        />
    )
}
