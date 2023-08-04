import React from 'react'
import { MentionResult, SpaceData, useMyChannels } from 'use-zion-client'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { Box, IconButton, MotionStack, Stack } from '@ui'
import { useSizeContext } from 'ui/hooks/useSizeContext'

// This is a list of the synced, joined Matrix channels
export const SyncedChannelList = (props: {
    space: SpaceData
    mentions: MentionResult[]
    canCreateChannel: boolean | undefined
    onShowCreateChannel: () => void
}) => {
    const sizeContext = useSizeContext()
    const isSmall = sizeContext.lessThan(120)
    const { mentions, space, onShowCreateChannel, canCreateChannel } = props

    const channelGroups = useMyChannels(space)

    return (
        <>
            {channelGroups.map((group) => (
                <MotionStack key={group.label} display={isSmall ? 'none' : 'flex'}>
                    <ChannelGroupHeader label={group.label}>
                        {canCreateChannel && (
                            <IconButton icon="plus" onClick={onShowCreateChannel} />
                        )}
                    </ChannelGroupHeader>
                    {group.channels?.map((channel) => {
                        const key = `${group.label}/${channel.id.slug}`
                        // only unread mentions at the channel root
                        const mentionCount = mentions.reduce(
                            (count, m) =>
                                m.unread && !m.thread && m.channel.id.slug === channel.id.slug
                                    ? count + 1
                                    : count,
                            0,
                        )
                        return (
                            <ChannelNavItem
                                key={key}
                                id={key}
                                space={space}
                                channel={channel}
                                mentionCount={mentionCount}
                            />
                        )
                    })}
                </MotionStack>
            ))}
        </>
    )
}

const ChannelGroupHeader = (props: { label: string; children?: React.ReactNode }) => (
    <Stack
        horizontal
        alignItems="center"
        justifyContent="spaceBetween"
        paddingRight="sm"
        height="height_lg"
    >
        <Box style={{ transform: 'translateY(2px)' }}>
            <ChannelNavGroup>{props.label}</ChannelNavGroup>
        </Box>
        {props.children}
    </Stack>
)
