import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
    Membership,
    MentionResult,
    RoomIdentifier,
    SpaceData,
    useInvitesForSpace,
    useSpaceMentions,
} from 'use-zion-client'
import { useSpaceThreadRootsUnreadCount } from 'use-zion-client/dist/hooks/use-space-thread-roots'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { Badge, Box, Icon, Stack } from '@ui'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { ChannelsShimmer } from '../Shimmer/ChannelsShimmer'
import { SideBar } from './_SideBar'

type Props = {
    space: SpaceData
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const invites = useInvitesForSpace(space.id)
    const navigate = useNavigate()

    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()

    const onSettings = useCallback(
        (spaceId: RoomIdentifier) => {
            navigate(`/spaces/${spaceId.slug}/settings`)
        },
        [navigate],
    )

    const isReady = !!space?.channelGroups?.length

    const mentions = useSpaceMentions()
    const unreadThreadMentions = mentions.reduce((count, m) => {
        return m.thread && m.unread ? count + 1 : count
    }, 0)

    return (
        <SideBar>
            <Stack padding position="relative" background="level2" width="100%" aspectRatio="1/1">
                <SettingsGear spaceId={space.id} spaceName={space.name} onSettings={onSettings} />
            </Stack>
            <Stack paddingY="md">
                {isReady && space?.membership === Membership.Join && (
                    <>
                        <ActionNavItem
                            highlight={unreadThreadsCount > 0}
                            icon="threads"
                            link={`/spaces/${space.id.slug}/threads`}
                            id="threads"
                            label="Threads"
                            badge={
                                unreadThreadMentions > 0 && <Badge value={unreadThreadMentions} />
                            }
                        />
                        <ActionNavItem
                            icon="at"
                            id="mentions"
                            label="Mentions"
                            link={`/spaces/${space.id.slug}/mentions`}
                        />
                    </>
                )}
                {isReady &&
                    invites.map((m, index) => (
                        <SpaceNavItem
                            isInvite
                            key={m.id.slug}
                            id={m.id}
                            name={m.name}
                            avatar={m.avatarSrc}
                            pinned={false}
                        />
                    ))}
                {isReady ? (
                    <>
                        <ChannelList space={space} mentions={mentions} />
                        <ActionNavItem
                            icon="plus"
                            id="newChannel"
                            label="Create channel"
                            link={`/spaces/${space.id.slug}/channels/new`}
                        />
                    </>
                ) : (
                    <ChannelsShimmer />
                )}
            </Stack>
        </SideBar>
    )
}

const ChannelList = (props: { space: SpaceData; mentions: MentionResult[] }) => {
    const sizeContext = useSizeContext()
    const isSmall = sizeContext.lessThan(120)
    const { mentions, space } = props

    return (
        <>
            {space.channelGroups.map((group) => (
                <Stack key={group.label} display={isSmall ? 'none' : 'flex'}>
                    <ChannelNavGroup>{group.label}</ChannelNavGroup>
                    {group.channels.map((channel) => {
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
                </Stack>
            ))}
        </>
    )
}

const SettingsGear = (props: {
    spaceId: RoomIdentifier
    onSettings: (spaceId: RoomIdentifier) => void
    spaceName: string
}) => {
    const { spaceId, onSettings, spaceName } = props

    const onSettingClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            onSettings?.(spaceId)
        },
        [onSettings, spaceId],
    )

    return (
        <Box horizontal>
            <CardOpener
                tabIndex={0}
                trigger="click"
                placement="topRight"
                render={
                    <Box padding>
                        <SpaceSettingsCard spaceId={spaceId} spaceName={spaceName} />
                    </Box>
                }
                layoutId="settings"
            >
                {({ triggerProps }) => (
                    <Box
                        color={{ hover: 'default', default: 'gray2' }}
                        onClick={onSettingClick}
                        {...triggerProps}
                    >
                        <Icon type="settings" size="square_sm" />
                    </Box>
                )}
            </CardOpener>
        </Box>
    )
}
