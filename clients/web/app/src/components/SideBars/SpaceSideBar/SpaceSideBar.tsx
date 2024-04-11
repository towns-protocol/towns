import React, { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    SpaceData,
    useConnectivity,
    useHasPermission,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
} from 'use-towns-client'
import { LayoutGroup } from 'framer-motion'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Card, IconButton, MotionBox, Stack, Text } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useShortcut } from 'hooks/useShortcut'
import { useSortedChannels } from 'hooks/useSortedChannels'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'
import { useDevice } from 'hooks/useDevice'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { OffscreenMarker, OffscreenPill } from '@components/OffscreenPill/OffscreenPill'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'
import { CondensedChannelNavItem } from './CondensedChannelNavItem'
import { useOffscreenMarkers } from './hooks/useOffscreenMarkers'

type Props = {
    space: SpaceData
}

const HEADER_MARGIN = 50

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const { isTouch } = useDevice()
    const { loggedInWalletAddress } = useConnectivity()
    const { createLink } = useCreateLink()
    const { unseenChannelIds } = useUnseenChannelIds()
    const scrollRef = useRef<HTMLDivElement>(null)

    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()

    const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false)
    const onHideCreateChannel = useEvent(() => setCreateChannelModalVisible(false))
    const onShowCreateChannel = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.CREATE_CHANNEL)
    })

    const { openPanel } = usePanelActions()

    const onShowBrowseChannels = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.BROWSE_CHANNELS)
    })

    const unreadThreadMentions = useSpaceUnreadThreadMentions()

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space.id,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const [hasScrolldedPastHeader, setHasScrolledPastHeader] = useState(false)
    const [scrollOffset, setScrollOffset] = useState(1)

    const headerRef = useRef<HTMLElement>(null)

    const onScroll = () => {
        const containerTop = scrollRef.current?.getBoundingClientRect().top ?? 0
        const headerY = (headerRef.current?.getBoundingClientRect()?.top ?? 0) - containerTop
        setScrollOffset(Math.max(0, Math.min(headerY - 58, 50)) / 50)
        setHasScrolledPastHeader(headerY > -1 && headerY <= 0)
    }

    const navigate = useNavigate()

    const onDisplayCreate = useCallback(() => {
        const link = createLink({ messageId: 'new' })
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate])

    useShortcut('CreateMessage', onDisplayCreate)

    const params = useParams()
    const currentRouteId = params.channelSlug

    const { favoriteChannels, unreadChannels, actualUnreadChannels, readChannels, readDms } =
        useSortedChannels({
            spaceId: space.id,
            currentRouteId,
        })

    const offscreenMarkers = useOffscreenMarkers({
        unreadChannels: actualUnreadChannels,
        unreadThreadsCount,
        unreadThreadMentions,
    })

    const itemRenderer = useCallback(
        (u: (typeof unreadChannels)[0], isUnreadSection?: boolean) => {
            const key = `${u.id}`
            return (
                <SpaceSideBarListItem key={key}>
                    <OffscreenMarker id={key} containerMarginTop={HEADER_MARGIN} />
                    {u.type === 'dm' ? (
                        <CondensedChannelNavItem
                            unread={u.unread}
                            key={key}
                            channel={u.channel}
                            favorite={u.favorite}
                            isUnreadSection={isUnreadSection}
                        />
                    ) : (
                        <ChannelNavItem
                            key={key}
                            id={u.id}
                            space={space}
                            channel={u.channel}
                            mentionCount={u.mentionCount}
                            favorite={u.favorite}
                            isUnreadSection={isUnreadSection}
                        />
                    )}
                </SpaceSideBarListItem>
            )
        },
        [space],
    )

    return (
        <>
            <Card
                absoluteFill
                scroll
                data-testid="space-sidebar"
                ref={scrollRef}
                onScroll={onScroll}
            >
                <Box grow elevateReadability position="relative">
                    <Stack
                        position="absolute"
                        className={styles.gradientBackground}
                        width="100%"
                        height="200"
                    />

                    <SpaceSideBarHeader
                        scrollOffset={scrollOffset}
                        space={space}
                        opaqueHeaderBar={hasScrolldedPastHeader}
                        headerRef={headerRef}
                    />

                    <Stack grow paddingY="md">
                        {space.isLoadingChannels ? (
                            <SidebarLoadingAnimation />
                        ) : (
                            <LayoutGroup>
                                {/* threads */}
                                <SpaceSideBarListItem key="threads">
                                    <OffscreenMarker
                                        id="threads"
                                        containerMarginTop={HEADER_MARGIN}
                                    />
                                    <ActionNavItem
                                        highlight={unreadThreadsCount > 0}
                                        icon="threads"
                                        link={`/${PATHS.SPACES}/${space.id}/threads`}
                                        id="threads"
                                        label="Threads"
                                        badge={
                                            unreadThreadMentions > 0 && (
                                                <Badge value={unreadThreadMentions} />
                                            )
                                        }
                                        minHeight="x5"
                                        key="threads"
                                    />
                                </SpaceSideBarListItem>

                                {/* mentions */}
                                <SpaceSideBarListItem key="mentions">
                                    <ActionNavItem
                                        icon="at"
                                        id="mentions"
                                        label="Mentions"
                                        link={`/${PATHS.SPACES}/${space.id}/mentions`}
                                        minHeight="x5"
                                        key="mentions"
                                    />
                                </SpaceSideBarListItem>

                                <SpaceSideBarSectionHeader
                                    label="Unreads"
                                    key="unreads"
                                    hidden={unreadChannels.length === 0}
                                />
                                <OffscreenMarker id="unreads" containerMarginTop={HEADER_MARGIN} />
                                {unreadChannels.map((channel) => itemRenderer(channel, true))}

                                <SpaceSideBarSectionHeader
                                    label="Favorites"
                                    key="favorites"
                                    hidden={favoriteChannels.length === 0}
                                />
                                {favoriteChannels.map((channel) => itemRenderer(channel))}

                                <SpaceSideBarSectionHeader
                                    label="Channels"
                                    badgeValue={unseenChannelIds.size}
                                    headerContent={
                                        <Stack horizontal alignItems="center">
                                            <IconButton
                                                icon={
                                                    unseenChannelIds.size > 0
                                                        ? 'searchBadged'
                                                        : 'search'
                                                }
                                                tooltip="Browse channels"
                                                tooltipOptions={{ immediate: true }}
                                                onClick={onShowBrowseChannels}
                                            />

                                            {canCreateChannel && (
                                                <IconButton
                                                    icon="plus"
                                                    tooltip="New channel"
                                                    tooltipOptions={{ immediate: true }}
                                                    onClick={onShowCreateChannel}
                                                />
                                            )}
                                        </Stack>
                                    }
                                    key="channels"
                                />

                                {readChannels.map((channel) => itemRenderer(channel))}

                                {canCreateChannel && (
                                    <SpaceSideBarListItem key="create-channel">
                                        <ActionNavItem
                                            icon="plus"
                                            id="newChannel"
                                            label="Create channel"
                                            onClick={onShowCreateChannel}
                                        />
                                    </SpaceSideBarListItem>
                                )}

                                <SpaceSideBarSectionHeader
                                    label="Direct Messages"
                                    headerContent={
                                        <IconButton
                                            size="square_sm"
                                            icon="compose"
                                            color="gray2"
                                            cursor="pointer"
                                            tooltip="New message"
                                            onClick={onDisplayCreate}
                                        />
                                    }
                                    key="direct-messages"
                                />
                                {readDms.map((channel) => itemRenderer(channel))}
                            </LayoutGroup>
                        )}
                    </Stack>

                    <Box gap paddingTop="md" paddingX="sm" paddingBottom="lg">
                        <Text textAlign="center" color="gray2" fontSize="sm">
                            Towns {APP_VERSION} ({APP_COMMIT_HASH})
                        </Text>
                    </Box>
                </Box>

                {isCreateChannelModalVisible ? (
                    <ModalContainer onHide={onHideCreateChannel}>
                        <CreateChannelFormContainer
                            spaceId={space.id}
                            onHide={onHideCreateChannel}
                        />
                    </ModalContainer>
                ) : (
                    <></>
                )}
                <OffscreenPill
                    markers={offscreenMarkers.markers}
                    defaultLabel={offscreenMarkers.defaultLabel}
                    scrollRef={scrollRef}
                    containerMarginTop={HEADER_MARGIN}
                />
                {/* the service worker won't exist in dev-mode and there's not need to check for updates */}
                {(!env.DEV || env.VITE_PUSH_NOTIFICATION_ENABLED) && !isTouch && <ReloadPrompt />}
            </Card>
        </>
    )
}

const SpaceSideBarListItem = ({ children }: { children: React.ReactNode }) => {
    return (
        <MotionBox
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'circOut' }}
            exit={{ opacity: 0 }}
            layout="position"
        >
            {children}
        </MotionBox>
    )
}

const SpaceSideBarSectionHeader = (props: {
    label: string
    badgeValue?: number
    hidden?: boolean
    headerContent?: React.ReactNode
}) => {
    return props.hidden ? null : (
        <SpaceSideBarListItem key={props.label}>
            <ChannelNavGroup label={props.label} badgeValue={props.badgeValue}>
                {props.headerContent}
            </ChannelNavGroup>
        </SpaceSideBarListItem>
    )
}
