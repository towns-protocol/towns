import React from 'react'
import { MentionResult, SpaceData, useMyChannels } from 'use-zion-client'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { IconButton } from '@ui'
import { SidebarListLayout } from './SidebarListLayout'

export const ChannelList = (props: {
    space: SpaceData
    mentions: MentionResult[]
    canCreateChannel: boolean | undefined
    onShowCreateChannel?: () => void
}) => {
    const { mentions, space, onShowCreateChannel, canCreateChannel } = props
    const channelGroups = useMyChannels(space)

    return (
        <>
            {channelGroups.map((group) => (
                <SidebarListLayout
                    key={group.label}
                    label={group.label}
                    channels={group.channels}
                    headerContent={
                        canCreateChannel && (
                            <IconButton
                                icon="plus"
                                tooltip="New channel"
                                tooltipOptions={{ immediate: true }}
                                onClick={onShowCreateChannel}
                            />
                        )
                    }
                    itemRenderer={(channel) => {
                        // only unread mentions at the channel root
                        const mentionCount = mentions.reduce(
                            (count, m) =>
                                m.unread &&
                                !m.thread &&
                                m.channel.id.streamId === channel.id.streamId
                                    ? count + 1
                                    : count,
                            0,
                        )
                        return (
                            <ChannelNavItem
                                key={channel.id.streamId}
                                id={channel.id.streamId}
                                space={space}
                                channel={channel}
                                mentionCount={mentionCount}
                            />
                        )
                    }}
                />
            ))}
        </>
    )
}
