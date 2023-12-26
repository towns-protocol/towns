import React, { useMemo } from 'react'
import {
    DMChannelIdentifier,
    useDMLatestMessage,
    useSpaceMembers,
    useZionContext,
} from 'use-zion-client'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
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
                <CondensedChannelNavItem channel={c} unread={dmUnreadChannelIds.has(c.id)} />
            )}
        />
    )
}

const CondensedChannelNavItem = (props: { channel: DMChannelIdentifier; unread: boolean }) => {
    const { channel, unread } = props
    const { createLink } = useCreateLink()
    const { unreadCount } = useDMLatestMessage(channel.id)
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
                        <DirectMessageIcon channel={channel} width="x4" />
                    </Box>
                }
                id={channel.id}
                label={<DirectMessageName channel={channel} />}
                highlight={unread}
                link={createLink({ messageId: channel.id })}
                minHeight="x5"
            />
        </DMChannelContextUserLookupProvider>
    )
}
