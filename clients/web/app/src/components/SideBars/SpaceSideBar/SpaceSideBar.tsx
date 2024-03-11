import React, { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    Permission,
    SpaceData,
    useHasPermission,
    useIsSpaceOwner,
    useMyMembership,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
} from 'use-towns-client'
import { CreateDirectMessage } from '@components/DirectMessages/CreateDirectMessage/CreateDirectMessage'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { ChannelNavItem } from '@components/NavItem/ChannelNavItem'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useCreateLink } from 'hooks/useCreateLink'
import { useShortcut } from 'hooks/useShortcut'
import { useSortedChannels } from 'hooks/useSortedChannels'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'
import { useDevice } from 'hooks/useDevice'
import { SideBar } from '../_SideBar'
import { SidebarListLayout } from './SidebarListLayout'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'
import { CondensedChannelNavItem } from './CondensedChannelNavItem'

type Props = {
    space: SpaceData
    className?: string
}

enum LayoutMode {
    Default = 'default',
    CreateMessage = 'create-message',
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const { isTouch } = useDevice()
    const { loggedInWalletAddress } = useAuth()
    const { createLink } = useCreateLink()

    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { isOwner } = useIsSpaceOwner(space.id, loggedInWalletAddress)
    const setDismissedGettingStarted = useStore((state) => state.setDismissedGettingStarted)
    const dismissedGettingStartedMap = useStore((state) => state.dismissedGettingStartedMap)

    const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false)
    const onHideCreateChannel = useEvent(() => setCreateChannelModalVisible(false))
    const onShowCreateChannel = useEvent(() => {
        const path = createLink({
            spaceId: space.id,
            panel: 'create-channel',
        })

        if (path) {
            navigate(path)
        }
    })

    const onShowBrowseChannels = useEvent(() => {
        const path = createLink({
            spaceId: space.id,
            panel: 'browse-channels',
        })

        if (path) {
            navigate(path)
        }
    })

    const unreadThreadMentions = useSpaceUnreadThreadMentions()

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space.id,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const onRemoveGettingStarted = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDismissedGettingStarted(space.id)
        },
        [setDismissedGettingStarted, space.id],
    )

    const [hasScrolldedPastHeader, setHasScrolledPastHeader] = useState(false)
    const [scrollOffset, setScrollOffset] = useState(1)

    const headerRef = useRef<HTMLElement>(null)
    const onScroll = (e: React.UIEvent) => {
        const headerY = headerRef.current?.getBoundingClientRect()?.top ?? -1
        setScrollOffset(Math.max(0, Math.min(headerY - 58, 50)) / 50)
        setHasScrolledPastHeader(headerY > -1 && headerY <= 0)
    }

    const [layoutMode, setLayoutMode] = useState<LayoutMode>(LayoutMode.Default)

    const navigate = useNavigate()

    const onDisplayCreate = useCallback(() => {
        const link = createLink({ messageId: 'new' })
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate])

    const onDisplayDefault = useCallback(() => {
        setLayoutMode(LayoutMode.Default)
    }, [])

    useShortcut('CreateMessage', onDisplayCreate)

    const params = useParams()
    const currentRouteId = params.channelSlug

    const { unreadChannels, readChannels, readDms } = useSortedChannels({
        spaceId: space.id,
        currentRouteId,
    })

    const itemRenderer = useCallback(
        (u: (typeof unreadChannels)[0]) => {
            if (u.type === 'dm') {
                return <CondensedChannelNavItem unread={u.unread} key={u.id} channel={u.channel} />
            } else {
                return (
                    <ChannelNavItem
                        key={u.id}
                        id={u.id}
                        space={space}
                        channel={u.channel}
                        mentionCount={u.mentionCount}
                    />
                )
            }
        },
        [space],
    )

    return (
        <Box absoluteFill>
            <SideBar data-testid="space-sidebar" height="100%" onScroll={onScroll}>
                <FadeInBox grow elevateReadability className={props.className}>
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
                        {membership === Membership.Join && (
                            <>
                                {isOwner && !dismissedGettingStartedMap[space.id] && (
                                    <Box className={styles.buttonTextParent}>
                                        <ActionNavItem
                                            icon="wand"
                                            id="getting-started"
                                            label="Getting Started"
                                            link={`/${PATHS.SPACES}/${space.id}/${PATHS.GETTING_STARTED}`}
                                            minHeight="x5"
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
                            </>
                        )}
                        {space.isLoadingChannels ? (
                            <SidebarLoadingAnimation />
                        ) : layoutMode === 'create-message' ? (
                            <Box grow color="gray2">
                                <ChannelNavGroup label="New Message">
                                    <IconButton
                                        icon="close"
                                        color="gray2"
                                        size="square_sm"
                                        cursor="pointer"
                                        onClick={onDisplayDefault}
                                    />
                                </ChannelNavGroup>
                                <CreateDirectMessage onDirectMessageCreated={onDisplayDefault} />
                            </Box>
                        ) : (
                            <FadeIn>
                                {/* threads */}
                                <ActionNavItem
                                    highlight={unreadThreadsCount > 0}
                                    icon="threads"
                                    link={`/${PATHS.SPACES}/${space.id}/threads`}
                                    id="threads"
                                    label="message"
                                    badge={
                                        unreadThreadMentions > 0 && (
                                            <Badge value={unreadThreadMentions} />
                                        )
                                    }
                                    minHeight="x5"
                                />
                                {/* mentions */}
                                <ActionNavItem
                                    icon="at"
                                    id="mentions"
                                    label="Mentions"
                                    link={`/${PATHS.SPACES}/${space.id}/mentions`}
                                    minHeight="x5"
                                />
                                <SidebarListLayout
                                    label="Unreads"
                                    channels={unreadChannels}
                                    itemRenderer={itemRenderer}
                                />

                                <SidebarListLayout
                                    label="Channels"
                                    channels={readChannels}
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
                                    itemRenderer={itemRenderer}
                                />

                                <ActionNavItem
                                    icon="search"
                                    id="browseChannels"
                                    label="Browse channels"
                                    minHeight="x5"
                                    onClick={onShowBrowseChannels}
                                />

                                {canCreateChannel && (
                                    <ActionNavItem
                                        icon="plus"
                                        id="newChannel"
                                        label="Create channel"
                                        onClick={onShowCreateChannel}
                                    />
                                )}
                                <SidebarListLayout
                                    label="Direct Messages"
                                    channels={readDms}
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
                                    itemRenderer={itemRenderer}
                                />
                            </FadeIn>
                        )}
                    </Stack>

                    <Box gap paddingTop="md" paddingX="sm" paddingBottom="lg">
                        <Text textAlign="center" color="gray2" fontSize="sm">
                            Towns {APP_VERSION} ({APP_COMMIT_HASH})
                        </Text>
                    </Box>
                </FadeInBox>
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
            </SideBar>
            {/* the service worker won't exist in dev-mode and there's not need to check for updates */}
            {(!env.DEV || env.VITE_PUSH_NOTIFICATION_ENABLED) && !isTouch && <ReloadPrompt />}
        </Box>
    )
}
