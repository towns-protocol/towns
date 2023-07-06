import React, { useCallback, useEffect, useMemo } from 'react'
import { Channel, Membership, MentionResult, SpaceData, useZionClient } from 'use-zion-client'
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
    const { client } = useZionClient()
    const sizeContext = useSizeContext()
    const isSmall = sizeContext.lessThan(120)
    const { mentions, space, onShowCreateChannel, canCreateChannel } = props

    // channels that you leave, but other members are still a part of, will still sync (partially?) and show up in this list
    // but we don't want that, since all channels are listed in the "Browse Channels" section
    //TODO: HNT-1716
    const filterUnjoinedChannels = useCallback(
        (channels: Channel[]) => {
            if (!client) {
                return
            }

            return channels.filter((channel) => {
                // getRoomData throws an error when matrix client is undefined during logout
                try {
                    const roomData = client?.getRoomData(channel.id)
                    return roomData?.membership === Membership.Join
                } catch (error) {
                    return false
                }
            })
        },
        [client],
    )

    const channelGroups = useMemo(() => {
        return space.channelGroups.map((group) => {
            return {
                ...group,
                channels: filterUnjoinedChannels(group.channels),
            }
        })
    }, [filterUnjoinedChannels, space.channelGroups])

    // https://linear.app/hnt-labs/issue/HNT-1594/app-hanging-and-not-loading-on-desktop
    useEffect(() => {
        console.log('<SyncedChannelList /> debug: ', {
            space,
            channelGroups,
        })
    }, [channelGroups, space])

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
