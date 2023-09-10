import React, { useCallback, useMemo, useRef, useState } from 'react'
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
    useZionClient,
} from 'use-zion-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Button, Icon, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { useAuth } from 'hooks/useAuth'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { SideBar } from '../_SideBar'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'
import { SyncedChannelList } from './SyncedChannelList'

type Props = {
    space: SpaceData
    className?: string
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const { client } = useZionClient()
    const { loggedInWalletAddress } = useAuth()

    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { hasPermission: isOwner } = useHasPermission({
        spaceId: space.id.networkId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Owner,
    })
    const setDismissedGettingStarted = useStore((state) => state.setDismissedGettingStarted)
    const dismissedGettingStartedMap = useStore((state) => state.dismissedGettingStartedMap)
    const channels = useSpaceChannels()

    const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false)
    const onHideCreateChannel = useEvent(() => setCreateChannelModalVisible(false))
    const onShowCreateChannel = useEvent(() => setCreateChannelModalVisible(true))

    const [isBrowseChannelsModalVisible, setBrowseChannelsModalVisible] = useState(false)
    const onHideBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(false))
    const onShowBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(true))

    const mentions = useSpaceMentions()
    const unreadThreadMentions = useSpaceUnreadThreadMentions()

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space.id.networkId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

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

    const isMemberOfAnyChannel = useMemo(() => {
        if (!client) {
            return false
        }

        return channels.some((channel) => {
            const roomData = client?.getRoomData(channel.id)
            return roomData?.membership === Membership.Join
        })
    }, [client, channels])

    return (
        <SideBar data-testid="space-sidebar" height="100vh" onScroll={onScroll}>
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
                    ) : (
                        <FadeIn>
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
                                minHeight="x5"
                            />
                            <ActionNavItem
                                icon="at"
                                id="mentions"
                                label="Mentions"
                                link={`/${PATHS.SPACES}/${space.id.slug}/mentions`}
                                minHeight="x5"
                            />
                            <SyncedChannelList
                                key={space.id.networkId}
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
                            {!isMemberOfAnyChannel && canCreateChannel && (
                                <ActionNavItem
                                    icon="plus"
                                    id="newChannel"
                                    label="Create channel"
                                    onClick={onShowCreateChannel}
                                />
                            )}
                        </FadeIn>
                    )}
                </Stack>
                <Box grow paddingX="sm" paddingY="lg" justifyContent="end">
                    <SentryReportModal />
                    <Box paddingTop="md">
                        <Text textAlign="center" color="gray2" fontSize="sm">
                            Towns {APP_VERSION} ({APP_COMMIT_HASH})
                        </Text>
                    </Box>
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
