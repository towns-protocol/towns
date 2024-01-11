import React, { useCallback, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    Permission,
    SpaceData,
    useHasPermission,
    useMyMembership,
    useSpaceMentions,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
} from 'use-zion-client'
import { useNavigate } from 'react-router'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ErrorReportModal } from '@components/ErrorReport/ErrorReport'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { useAuth } from 'hooks/useAuth'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { CreateDirectMessage } from '@components/DirectMessages/CreateDirectMessage'
import { ChannelNavGroup } from '@components/NavItem/ChannelNavGroup'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
import { SideBar } from '../_SideBar'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'
import { ChannelList } from './ChannelList'
import { DirectMessageChannelList } from './DirectMessageChannelList'

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
    const { loggedInWalletAddress } = useAuth()

    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { hasPermission: isOwner } = useHasPermission({
        spaceId: space.id,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Owner,
    })
    const setDismissedGettingStarted = useStore((state) => state.setDismissedGettingStarted)
    const dismissedGettingStartedMap = useStore((state) => state.dismissedGettingStartedMap)

    const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false)
    const onHideCreateChannel = useEvent(() => setCreateChannelModalVisible(false))
    const onShowCreateChannel = useEvent(() => setCreateChannelModalVisible(true))

    const [isBrowseChannelsModalVisible, setBrowseChannelsModalVisible] = useState(false)
    const onHideBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(false))
    const onShowBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(true))

    const mentions = useSpaceMentions()
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
    const { createLink } = useCreateLink()

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

    return (
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
                            />
                            <ActionNavItem
                                icon="at"
                                id="mentions"
                                label="Mentions"
                                link={`/${PATHS.SPACES}/${space.id}/mentions`}
                                minHeight="x5"
                            />
                            <ChannelList
                                key={space.id}
                                space={space}
                                mentions={mentions}
                                canCreateChannel={canCreateChannel}
                                onShowCreateChannel={onShowCreateChannel}
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
                            <DirectMessageChannelList onDisplayCreate={onDisplayCreate} />
                        </FadeIn>
                    )}
                </Stack>

                <Box gap paddingTop="md" paddingX="sm" paddingBottom="lg">
                    <Text textAlign="center" color="gray2" fontSize="sm">
                        Towns {APP_VERSION} ({APP_COMMIT_HASH})
                    </Text>
                    <ErrorReportModal />
                </Box>
            </FadeInBox>
            {isBrowseChannelsModalVisible ? (
                <ModalContainer minWidth="500" onHide={onHideBrowseChannels}>
                    <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                </ModalContainer>
            ) : isCreateChannelModalVisible ? (
                <ModalContainer onHide={onHideCreateChannel}>
                    <CreateChannelFormContainer spaceId={space.id} onHide={onHideCreateChannel} />
                </ModalContainer>
            ) : (
                <></>
            )}
        </SideBar>
    )
}
