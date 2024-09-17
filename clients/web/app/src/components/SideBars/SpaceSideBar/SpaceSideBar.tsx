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
import { genId } from '@river-build/sdk'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Card, IconButton, MotionBox, Paragraph, Stack } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useShortcut } from 'hooks/useShortcut'
import { useSortedChannels } from 'hooks/useSortedChannels'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'
import { isReduceMotion, useDevice } from 'hooks/useDevice'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { OffscreenMarker, OffscreenPill } from '@components/OffscreenPill/OffscreenPill'
import { Analytics } from 'hooks/useAnalytics'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'
import { CondensedChannelNavItem } from './CondensedChannelNavItem'
import { useOffscreenMarkers } from './hooks/useOffscreenMarkers'
import { AppVersionText } from './AppVersionText'

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
        Analytics.getInstance().track('clicked new channel', { spaceId: space.id }, () => {
            console.log('[analytics] clicked new channel')
        })
        openPanel(CHANNEL_INFO_PARAMS.CREATE_CHANNEL, {
            channelFormId: `formid-${genId(5)}`,
        })
    })

    const { openPanel } = usePanelActions()

    const onShowBrowseChannels = useEvent(() => {
        Analytics.getInstance().track('clicked browse channels', { spaceId: space.id }, () => {
            console.log('[analytics] clicked browse channels', { spaceId: space.id })
        })
        openPanel(CHANNEL_INFO_PARAMS.BROWSE_CHANNELS)
    })

    const unreadThreadMentions = useSpaceUnreadThreadMentions()

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space.id,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const [hasScrolldedPastHeader, setHasScrolledPastHeader] = useState(false)

    const headerRef = useRef<HTMLElement>(null)

    const onScroll = () => {
        const containerTop = scrollRef.current?.getBoundingClientRect().top ?? 0
        const headerY = (headerRef.current?.getBoundingClientRect()?.top ?? 0) - containerTop
        setHasScrolledPastHeader(headerY === 8)
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
                            dataTestId={`${u.channel.label}-channel`}
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
                        height="150"
                    />

                    <SpaceSideBarHeader
                        space={space}
                        opaqueHeaderBar={hasScrolldedPastHeader}
                        headerRef={headerRef}
                    />

                    <Stack grow paddingY="md">
                        {space.isLoadingChannels ? (
                            <SidebarLoadingAnimation />
                        ) : (
                            <>
                                <MenuGroup>
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
                                            data-testid="threads-nav-item"
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
                                            data-testid="mentions-nav-item"
                                        />
                                    </SpaceSideBarListItem>
                                </MenuGroup>
                                <MenuGroup>
                                    <SpaceSideBarSectionHeader
                                        label="Unreads"
                                        key="unreads"
                                        hidden={unreadChannels.length === 0}
                                    />
                                    <OffscreenMarker
                                        id="unreads"
                                        containerMarginTop={HEADER_MARGIN}
                                    />
                                    {unreadChannels.map((channel) => itemRenderer(channel, true))}
                                </MenuGroup>
                                <MenuGroup>
                                    <SpaceSideBarSectionHeader
                                        label="Favorites"
                                        key="favorites"
                                        hidden={favoriteChannels.length === 0}
                                    />
                                    {favoriteChannels.map((channel) => itemRenderer(channel))}

                                    <SpaceSideBarSectionHeader
                                        label="Channels"
                                        badgeValue={unseenChannelIds.size}
                                        dataTestId="channels-header"
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
                                </MenuGroup>
                                <MenuGroup>
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
                                </MenuGroup>
                            </>
                        )}
                    </Stack>

                    <Box
                        centerContent
                        paddingTop="md"
                        paddingX="sm"
                        paddingBottom="x4"
                        style={{ opacity: 0.5 }}
                    >
                        <Paragraph size="xs" textAlign="center" color="gray2">
                            <AppVersionText />
                        </Paragraph>
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
const REDUCE_MOTION = isReduceMotion()

const MenuGroup = ({ children }: { children: React.ReactNode }) =>
    REDUCE_MOTION ? children : <LayoutGroup>{children}</LayoutGroup>

const SpaceSideBarListItem = ({ children }: { children: React.ReactNode }) => {
    return REDUCE_MOTION ? (
        children
    ) : (
        <MotionBox
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                transition: {
                    opacity: {
                        delay: 0.15,
                        duration: 0.25,
                        ease: 'easeIn',
                    },
                },
            }}
            exit={{ opacity: 0 }}
            layout="position"
            transition={{
                layout: { duration: 0.4, ease: 'circOut' },
            }}
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
    dataTestId?: string
}) => {
    return props.hidden ? null : (
        <SpaceSideBarListItem key={props.label}>
            <ChannelNavGroup
                label={props.label}
                badgeValue={props.badgeValue}
                dataTestId={props.dataTestId}
            >
                {props.headerContent}
            </ChannelNavGroup>
        </SpaceSideBarListItem>
    )
}
