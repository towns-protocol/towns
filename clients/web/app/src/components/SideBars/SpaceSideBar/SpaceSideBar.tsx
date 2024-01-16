import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Membership,
    Permission,
    SpaceData,
    useHasPermission,
    useMyMembership,
    useSpaceMembers,
    useSpaceMentions,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
    useZionContext,
} from 'use-zion-client'
import { CreateDirectMessage } from '@components/DirectMessages/CreateDirectMessage'
import { ErrorReportModal } from '@components/ErrorReport/ErrorReport'
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
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { useStore } from 'store/store'
import { notUndefined } from 'ui/utils/utils'
import { SideBar } from '../_SideBar'
import { CondensedChannelNavItem } from './DirectMessageChannelList'
import { SidebarListLayout } from './SidebarListLayout'
import * as styles from './SpaceSideBar.css'
import { SpaceSideBarHeader } from './SpaceSideBarHeader'
import { SidebarLoadingAnimation } from './SpaceSideBarLoading'

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

    const { unreads, readChannels, readDms } = useSortedChannels(space.id)

    const itemRenderer = useCallback(
        (u: (typeof unreads)[0]) => {
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
                                label="Threads"
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
                                channels={unreads}
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

const useSortedChannels = (spaceId: string) => {
    const mentions = useSpaceMentions()
    const channels = useSpaceChannels()
    const { spaceUnreadChannelIds, dmUnreadChannelIds, dmChannels } = useZionContext()
    const { memberIds } = useSpaceMembers()

    const unreadChannelIds = spaceUnreadChannelIds[spaceId]

    const channelItems = useMemo(() => {
        return channels
            .map((channel) => {
                const mentionCount = mentions.reduce(
                    (count, m) =>
                        m.unread && !m.thread && m.channel.id === channel.id ? count + 1 : count,
                    0,
                )
                return channel
                    ? ({
                          type: 'channel',
                          id: channel.id,
                          channel,
                          mentionCount,
                          unread: !!unreadChannelIds?.has(channel.id),
                          latestMs: Number(0),
                      } as const)
                    : undefined
            })
            .filter(notUndefined)
    }, [channels, mentions, unreadChannelIds])

    const dmItems = useMemo(() => {
        return Array.from(dmChannels)
            .filter((c) => !c.left && c.userIds.every((m) => memberIds.includes(m)))
            .map((channel) => {
                return channel
                    ? ({
                          type: 'dm',
                          id: channel.id,
                          channel,
                          unread: dmUnreadChannelIds.has(channel.id),
                          latestMs: Number(channel?.lastEventCreatedAtEpocMs ?? 0),
                      } as const)
                    : undefined
            })
            .filter(notUndefined)
    }, [dmChannels, dmUnreadChannelIds, memberIds])

    const params = useParams()
    const currentRouteId = params.channelSlug
    const prevUnreads = useRef<string[]>([])

    const persistUnreadId =
        currentRouteId && prevUnreads.current.includes(currentRouteId) ? currentRouteId : undefined

    const unreads = useMemo(() => {
        return [
            ...channelItems.filter((c) => c.unread || c.channel.id === persistUnreadId),
            ...dmItems.filter((c) => c.unread || c.channel.id === persistUnreadId),
        ].sort((a, b) => Math.sign(b.latestMs - a.latestMs))
    }, [channelItems, dmItems, persistUnreadId])

    useEffect(() => {
        prevUnreads.current = unreads.map((u) => u.id)
    }, [unreads])

    const readChannels = useMemo(() => {
        return [...channelItems.filter((c) => !c.unread && persistUnreadId !== c.id)].sort((a, b) =>
            a.channel.label.localeCompare(b.channel.label),
        )
    }, [channelItems, persistUnreadId])

    const readDms = useMemo(() => {
        return [...dmItems.filter((c) => !c.unread && persistUnreadId !== c.id)].sort((a, b) =>
            Math.sign(b.latestMs - a.latestMs),
        )
    }, [dmItems, persistUnreadId])

    return {
        readChannels,
        readDms,
        unreads,
    }
}
