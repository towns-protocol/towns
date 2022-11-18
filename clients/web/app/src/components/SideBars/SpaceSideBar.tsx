import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
    Membership,
    RoomIdentifier,
    SpaceData,
    useInvitesForSpace,
    useZionContext,
} from 'use-zion-client'
import { useSpaceThreadRootsUnreadCount } from 'use-zion-client/dist/hooks/use-space-thread-roots'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { Badge, Box, Icon, Stack, TooltipRenderer } from '@ui'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { ChannelsShimmer } from '../Shimmer/ChannelsShimmer'
import { SideBar } from './_SideBar'

type Props = {
    space: SpaceData
}

const useTotalMentionCount = () => {
    const { mentionCounts } = useZionContext()
    return Object.entries(mentionCounts).reduce((total, e) => {
        return total + (e[1] || 0)
    }, 0)
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const invites = useInvitesForSpace(space.id)
    const navigate = useNavigate()

    const totalMentions = useTotalMentionCount()
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()

    const onSettings = useCallback(
        (spaceId: RoomIdentifier) => {
            navigate(`/spaces/${spaceId.slug}/settings`)
        },
        [navigate],
    )

    const isReady = !!space?.channelGroups?.length

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
                            badge={unreadThreadsCount > 0 && <Badge value={unreadThreadsCount} />}
                        />
                        <ActionNavItem
                            icon="at"
                            highlight={totalMentions > 0}
                            id="mentions"
                            label="Mentions"
                            badge={totalMentions > 0 && <Badge value={totalMentions} />}
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
                        <ChannelList space={space} />
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

const ChannelList = (props: { space: SpaceData }) => {
    const sizeContext = useSizeContext()
    const isSmall = sizeContext.lessThan(120)
    const { space } = props

    return (
        <>
            {space.channelGroups.map((group) => (
                <Stack key={group.label} display={isSmall ? 'none' : 'flex'}>
                    <ChannelNavGroup>{group.label}</ChannelNavGroup>
                    {group.channels.map((channel) => {
                        const key = `${group.label}/${channel.id.slug}`
                        return <ChannelNavItem key={key} id={key} space={space} channel={channel} />
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
            <TooltipRenderer
                trigger="click"
                placement="horizontal"
                render={<SpaceSettingsCard spaceId={spaceId} spaceName={spaceName} />}
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
            </TooltipRenderer>
        </Box>
    )
}
