import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
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
import { clsx } from 'clsx'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Button, Icon, IconName, Paragraph, Stack } from '@ui'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useHasPermission } from 'hooks/useHasPermission'
import { PATHS } from 'routes'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { shortAddress } from 'ui/utils/utils'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useStore } from 'store/store'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
import { SideBar } from '../_SideBar'
import * as styles from './SpaceSideBar.css'
import { FadeIn } from '../../Transitions/FadeIn'

type Props = {
    space: SpaceData
    className?: string
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const navigate = useNavigate()
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { data: isOwner } = useHasPermission(Permission.Owner)
    const setDismissedGettingStarted = useStore((state) => state.setDismissedGettingStarted)
    const dismissedGettingStartedMap = useStore((state) => state.dismissedGettingStartedMap)

    const onSettings = useCallback(
        (spaceId: RoomIdentifier) => {
            navigate(`/${PATHS.SPACES}/${spaceId.slug}/settings`)
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

    const onRemoveGettingStarted = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDismissedGettingStarted(space.id.networkId)
        },
        [setDismissedGettingStarted, space.id.networkId],
    )

    const [hasScrolldedPastHeader, setHasScrolledPastHeader] = useState(false)
    const [scrollOffset, setScrollOffset] = useState(1)

    const headerRef = useRef<HTMLElement>(null)
    const onScroll = (e: React.UIEvent) => {
        const headerY = headerRef.current?.getBoundingClientRect()?.top ?? -1
        setScrollOffset(Math.max(0, Math.min(headerY - 16, 50)) / 50)
        setHasScrolledPastHeader(headerY > -1 && headerY <= 0)
    }

    return (
        <SideBar data-testid="space-sidebar" height="100vh" onScroll={onScroll}>
            <Box className={props.className}>
                <Stack
                    position="absolute"
                    className={clsx([styles.gradientBackground])}
                    width="100%"
                    height="200"
                />
                <SpaceSideBarHeader
                    scrollOffset={scrollOffset}
                    space={space}
                    opaqueHeaderBar={hasScrolldedPastHeader}
                    headerRef={headerRef}
                    onSettings={onSettings}
                />

                <Stack paddingY="md">
                    {membership === Membership.Join && (
                        <>
                            {isOwner && !dismissedGettingStartedMap[space.id.networkId] && (
                                <Box className={styles.buttonTextParent}>
                                    <ActionNavItem
                                        icon="wand"
                                        id="getting-started"
                                        label="Getting Started"
                                        link={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.GETTING_STARTED}`}
                                    >
                                        <Button
                                            className={styles.buttonText}
                                            onClick={onRemoveGettingStarted}
                                        >
                                            <Icon type="close" />
                                        </Button>
                                    </ActionNavItem>
                                </Box>
                            )}

                            <ActionNavItem
                                highlight={unreadThreadsCount > 0}
                                icon="threads"
                                link={`/${PATHS.SPACES}/${space.id.slug}/threads`}
                                id="threads"
                                label="Threads"
                                badge={
                                    unreadThreadMentions > 0 && (
                                        <Badge value={unreadThreadMentions} />
                                    )
                                }
                            />
                            <ActionNavItem
                                icon="at"
                                id="mentions"
                                label="Mentions"
                                link={`/${PATHS.SPACES}/${space.id.slug}/mentions`}
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
            </Box>
        </SideBar>
    )
}

const SpaceSideBarHeader = (props: {
    headerRef: React.RefObject<HTMLElement>
    space: SpaceData
    opaqueHeaderBar: boolean
    scrollOffset: number
    onSettings: (spaceId: RoomIdentifier) => void
}) => {
    const { onSettings, opaqueHeaderBar, space } = props
    const currentChannelId = useChannelIdFromPathname()
    const { pathname } = useLocation()

    const { members } = useSpaceMembers()
    const { data: spaceInfo } = useContractSpaceInfo(space.id.networkId)

    const membersCount = members.length

    const navigate = useNavigate()

    const onMembersClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/members`)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `https://goerli.etherscan.io/address/${spaceInfo?.address}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

    const onTokenClick = useEvent(() => {
        const currentSpacePathWithoutInfo = matchPath(
            `${PATHS.SPACES}/:spaceSlug/:current`,
            pathname,
        )

        let path

        if (currentChannelId) {
            path = `/${PATHS.SPACES}/${space.id.slug}/channels/${currentChannelId}/info`
        } else if (currentSpacePathWithoutInfo) {
            path = `/${PATHS.SPACES}/${space.id.slug}/${currentSpacePathWithoutInfo?.params.current}/info`
        }

        if (path) {
            navigate(path)
        }
    })

    const hasName = !!space.name
    const hasMembers = membersCount > 0
    const hasAddress = !!spaceInfo?.address

    const size = useSizeContext()
    const isSmall = size.lessThan(200)

    const [isHeaderHovering, setIsHeaderHovering] = useState(false)
    const onHeaderOver = useCallback(() => {
        setIsHeaderHovering(true)
    }, [])
    const onHeaderLeave = useCallback(() => {
        setIsHeaderHovering(false)
    }, [])

    return (
        <>
            <Stack
                horizontal
                height="x8"
                zIndex="ui"
                pointerEvents={opaqueHeaderBar ? 'auto' : 'none'}
                className={clsx([styles.spaceHeader])}
                justifyContent="spaceBetween"
                onPointerEnter={onHeaderOver}
                onPointerLeave={onHeaderLeave}
            >
                <Box centerContent width="x8">
                    <SettingsGear
                        spaceId={space.id}
                        spaceName={space.name}
                        onSettings={onSettings}
                    />
                </Box>
                <Box centerContent width="x8">
                    <AnimatePresence>
                        {isHeaderHovering && (
                            <FadeIn fast>
                                <CopySpaceLink
                                    spaceId={space.id}
                                    background="none"
                                    color={{ hover: 'default', default: 'gray2' }}
                                />
                            </FadeIn>
                        )}
                    </AnimatePresence>
                </Box>
            </Stack>
            <Stack
                centerContent
                paddingTop="md"
                position="relative"
                width="100%"
                className={styles.spaceIconContainer}
                insetBottom="sm" // cheating since sibling is sticky and needs more top space
                onPointerEnter={onHeaderOver}
                onPointerLeave={onHeaderLeave}
                onClick={onTokenClick}
            >
                <Box height="x2" />
                {space ? (
                    <InteractiveSpaceIcon
                        key={space.id.networkId}
                        size="sm"
                        spaceId={space.id.networkId}
                        address={spaceInfo?.address}
                        spaceName={space.name}
                    />
                ) : (
                    <Box background="level1" rounded="full" width="x15" aspectRatio="1/1" />
                )}
            </Stack>

            <Stack
                width="100%"
                position="sticky"
                top="none"
                zIndex="above"
                height="x8"
                ref={props.headerRef}
            >
                <Stack
                    position="absolute"
                    bottom="none"
                    background="level1"
                    boxShadow="medium"
                    borderBottom={opaqueHeaderBar ? 'default' : 'none'}
                    height="x20"
                    width="100%"
                    pointerEvents="none"
                    style={{ opacity: 1 - props.scrollOffset }}
                />
                <Stack horizontal height="x8">
                    <Box width="x7" shrink={false} />
                    <Box grow position="relative">
                        <Box absoluteFill justifyContent="center">
                            {hasName && (
                                <Paragraph
                                    strong
                                    truncate
                                    size={isSmall ? 'md' : 'lg'}
                                    color="gray1"
                                    textAlign="center"
                                >
                                    {space.name}
                                </Paragraph>
                            )}
                        </Box>
                    </Box>
                    <Box width="x7" shrink={false} />
                </Stack>
            </Stack>

            {(hasMembers || hasAddress) && (
                <>
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
                </>
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
    const { data: canEditSettings } = useHasPermission(Permission.ModifySpaceSettings)

    const onSettingClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            onSettings?.(spaceId)
        },
        [onSettings, spaceId],
    )

    return (
        <CardOpener
            tabIndex={0}
            trigger="click"
            placement="horizontal"
            render={
                <SpaceSettingsCard
                    spaceId={spaceId}
                    spaceName={spaceName}
                    canEditSettings={Boolean(canEditSettings)}
                />
            }
            layoutId="settings"
        >
            {({ triggerProps }) => (
                <Box
                    padding="xs"
                    color={{ hover: 'default', default: 'gray2' }}
                    onClick={onSettingClick}
                    {...triggerProps}
                >
                    <Icon type="settings" size="square_sm" />
                </Box>
            )}
        </CardOpener>
    )
}
