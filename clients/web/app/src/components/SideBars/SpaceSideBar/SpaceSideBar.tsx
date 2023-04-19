import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    Permission,
    RoomIdentifier,
    SpaceData,
    useMyMembership,
    useSpaceMentions,
    useSpaceThreadRootsUnreadCount,
} from 'use-zion-client'
import { useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { Badge, Box, Button, Icon, Stack } from '@ui'
import { useHasPermission } from 'hooks/useHasPermission'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import {
    useContractChannels,
    queryKey as useContractChannelsQueryKey,
} from 'hooks/useContractChannels'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { SideBar } from '../_SideBar'
import * as styles from './SpaceSideBar.css'
import { SyncedChannelList } from './SyncedChannelList'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'

type Props = {
    space: SpaceData
    className?: string
}

function useInvalidateChannelsQueryOnNewChannelCreation(space: SpaceData) {
    const queryClient = useQueryClient()

    const flatChannels = useMemo(
        () => space.channelGroups.flatMap((g) => g.channels),
        [space.channelGroups],
    )

    const numChannelsAddedInSession = useRef<undefined | number>(undefined)

    // TODO: a better spot for this is proabably a wrapper component around space routes
    useEffect(() => {
        if (space.isLoadingChannels) {
            return
        }

        if (
            // new load or navigated to different space
            numChannelsAddedInSession.current === undefined ||
            // new channels were added - this happens when user creates a channel or is auto-joined by another user creating a channel
            flatChannels.length > numChannelsAddedInSession.current
        ) {
            queryClient.invalidateQueries([useContractChannelsQueryKey, space.id.networkId])
            numChannelsAddedInSession.current = flatChannels.length
        }
    }, [flatChannels.length, queryClient, space.id.networkId, space.isLoadingChannels])

    // refetch and reset the channelsAddedDuringSession when space changes
    useEffect(() => {
        queryClient.invalidateQueries([useContractChannelsQueryKey, space.id.networkId])
        numChannelsAddedInSession.current = undefined
    }, [queryClient, space.id.networkId])
}

export const SpaceSideBar = (props: Props) => {
    const { space } = props
    const navigate = useNavigate()
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const membership = useMyMembership(space?.id)
    const { data: isOwner } = useHasPermission(Permission.Owner)
    const setDismissedGettingStarted = useStore((state) => state.setDismissedGettingStarted)
    const dismissedGettingStartedMap = useStore((state) => state.dismissedGettingStartedMap)
    const { data: contractChannels } = useContractChannels(props.space.id.networkId)

    const onSettings = useCallback(
        (spaceId: RoomIdentifier) => {
            navigate(`/${PATHS.SPACES}/${spaceId.slug}/settings`)
        },
        [navigate],
    )

    const [isCreateChannelModalVisible, setCreateChannelModalVisible] = useState(false)
    const onHideCreateChannel = useEvent(() => setCreateChannelModalVisible(false))
    const onShowCreateChannel = useEvent(() => setCreateChannelModalVisible(true))

    const [isBrowseChannelsModalVisible, setBrowseChannelsModalVisible] = useState(false)
    const onHideBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(false))
    const onShowBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(true))

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

    const hasContractChannels = contractChannels && contractChannels.length > 0

    useInvalidateChannelsQueryOnNewChannelCreation(space)

    return (
        <SideBar data-testid="space-sidebar" height="100vh" onScroll={onScroll}>
            <Box grow className={props.className}>
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
                        <SyncedChannelList
                            space={space}
                            mentions={mentions}
                            canCreateChannel={canCreateChannel}
                            onShowCreateChannel={onShowCreateChannel}
                        />

                        {isBrowseChannelsModalVisible && (
                            <ModalContainer minWidth="500" onHide={onHideBrowseChannels}>
                                <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                            </ModalContainer>
                        )}
                        {!space.isLoadingChannels && hasContractChannels && (
                            <ActionNavItem
                                icon="search"
                                id="browseChannels"
                                label="Browse channels"
                                onClick={onShowBrowseChannels}
                            />
                        )}

                        {isCreateChannelModalVisible && (
                            <ModalContainer onHide={onHideCreateChannel}>
                                <CreateChannelFormContainer
                                    spaceId={space.id}
                                    onHide={onHideCreateChannel}
                                />
                            </ModalContainer>
                        )}
                        {!space.isLoadingChannels && !hasContractChannels && canCreateChannel && (
                            <ActionNavItem
                                icon="plus"
                                id="newChannel"
                                label="Create channel"
                                onClick={onShowCreateChannel}
                            />
                        )}
                    </>
                </Stack>
                <Box grow paddingX="sm" paddingY="lg" justifyContent="end">
                    <SentryReportModal />
                </Box>
            </Box>
        </SideBar>
    )
}
