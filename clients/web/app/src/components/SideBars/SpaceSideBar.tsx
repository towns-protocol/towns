import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import useEvent from 'react-use-event-hook'
import {
    Membership,
    MentionResult,
    Permission,
    RoomIdentifier,
    SpaceData,
    useMyMembership,
    useSpaceMembers,
    useSpaceMentions,
} from 'use-zion-client'
import { useSpaceThreadRootsUnreadCount } from 'use-zion-client/dist/hooks/use-space-thread-roots'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Icon, IconName, Paragraph, Stack } from '@ui'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useHasPermission } from 'hooks/useHasPermission'
import { PATHS } from 'routes'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { shortAddress } from 'ui/utils/utils'
import { SideBar } from './_SideBar'

type Props = {
    space: SpaceData
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const navigate = useNavigate()
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { data: isOwner } = useHasPermission(Permission.Owner)

    const onSettings = useCallback(
        (spaceId: RoomIdentifier) => {
            navigate(`/spaces/${spaceId.slug}/settings`)
        },
        [navigate],
    )

    const [modal, setModal] = useState(false)

    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    const mentions = useSpaceMentions()
    const unreadThreadMentions = mentions.reduce((count, m) => {
        return m.thread && m.unread ? count + 1 : count
    }, 0)

    const { data: canCreateChannel } = useHasPermission(Permission.AddRemoveChannels)

    return (
        <SideBar data-testid="space-sidebar">
            <SpaceSideBarHeader space={space} onSettings={onSettings} />
            <Stack paddingY="md">
                {membership === Membership.Join && (
                    <>
                        {isOwner && (
                            <ActionNavItem
                                icon="wand"
                                id="getting-started"
                                label="Getting Started"
                                link={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.GETTING_STARTED}`}
                            />
                        )}

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
                <>
                    <ChannelList space={space} mentions={mentions} />
                    {modal && (
                        <ModalContainer onHide={onHide}>
                            <CreateChannelFormContainer spaceId={space.id} onHide={onHide} />
                        </ModalContainer>
                    )}
                    {canCreateChannel && (
                        <ActionNavItem
                            icon="plus"
                            id="newChannel"
                            label="Create channel"
                            onClick={onShow}
                        />
                    )}
                </>
            </Stack>
        </SideBar>
    )
}

const SpaceSideBarHeader = (props: {
    space: SpaceData
    onSettings: (spaceId: RoomIdentifier) => void
}) => {
    const { space, onSettings } = props
    const { members } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id.networkId)

    const membersCount = members.length

    const navigate = useNavigate()

    const onMembersClick = useEvent(() => {
        navigate(`/spaces/${space.id.slug}/members`)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `https://goerli.etherscan.io/address/${spaceInfo?.address}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

    const hasName = !!space.name
    const hasMembers = membersCount > 0
    const hasAddress = !!spaceInfo?.address

    const size = useSizeContext()
    const isSmall = size.lessThan(200)

    return (
        <>
            <Stack
                centerContent
                padding="lg"
                position="relative"
                width="100%"
                gap="lg"
                shrink={false}
                style={{
                    background: `linear-gradient(180deg, #222026FF 0%, #151418FF 100%)`,
                }}
            >
                <Box padding position="topLeft">
                    <SettingsGear
                        spaceId={space.id}
                        spaceName={space.name}
                        onSettings={onSettings}
                    />
                </Box>
                <Box grow>
                    <Box background="level1" rounded="full" width="x15" aspectRatio="1/1" />
                </Box>
                {hasName && (
                    <Stack centerContent width="100%">
                        <Paragraph strong size="lg">
                            {space.name}
                        </Paragraph>
                    </Stack>
                )}
            </Stack>

            {(hasMembers || hasAddress) && (
                <Stack paddingX="md" gap="sm" insetX="xs">
                    {hasMembers && (
                        <SidebarPill
                            icon="people"
                            label="Members"
                            labelRight={membersCount}
                            onClick={onMembersClick}
                        />
                    )}
                    {hasAddress && (
                        <SidebarPill
                            icon="document"
                            label="Address"
                            labelRight={
                                isSmall
                                    ? `${spaceInfo?.address.slice(
                                          0,
                                          4,
                                      )}..${spaceInfo?.address.slice(-2)}`
                                    : shortAddress(spaceInfo?.address)
                            }
                            onClick={onAddressClick}
                        />
                    )}
                </Stack>
            )}
        </>
    )
}

const SidebarPill = (props: {
    icon: IconName
    label: string
    labelRight: string | number
    onClick?: () => void
}) => {
    return (
        <Stack
            horizontal
            transition
            border
            gap="sm"
            rounded="lg"
            paddingX="md"
            height="height_lg"
            alignItems="center"
            cursor="pointer"
            background={{
                default: 'level2',
                hover: 'level3',
            }}
            color="gray2"
            position="relative"
            onClick={props.onClick}
        >
            <Icon type={props.icon} size="square_md" padding="xxs" />
            <AnimatePresence mode="sync">
                <Paragraph size="sm">{props.label}</Paragraph>
            </AnimatePresence>
            <Stack horizontal grow alignItems="center" justifyContent="end">
                <Paragraph size="sm" color="default" textAlign="right">
                    {props.labelRight}
                </Paragraph>
            </Stack>
        </Stack>
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
            </CardOpener>
        </Box>
    )
}
