import { AnimatePresence } from 'framer-motion'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import {
    ChannelContextProvider,
    Permission,
    RoomIdentifier,
    RoomMember,
    SpaceData,
    getAccountAddress,
    useDMLatestMessage,
    useHasPermission,
    useSpaceData,
    useSpaceMembers,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
    useUserLookupContext,
} from 'use-zion-client'
import { DMChannelIdentifier } from 'use-zion-client/dist/types/dm-channel-identifier'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { Avatar } from '@components/Avatar/Avatar'
import {
    DirectMessageIcon,
    DirectMessageName,
} from '@components/DirectMessages/DirectMessageListItem'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { NavItem } from '@components/NavItem/_NavItem'
import { useSpaceDms } from '@components/SideBars/SpaceSideBar/DirectMessageChannelList'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { VisualViewportContextProvider } from '@components/VisualViewportContext/VisualViewportContext'
import { CreateChannelFormModal } from '@components/Web3/CreateChannelForm/CreateChannelForm'
import {
    Badge,
    Box,
    BoxProps,
    Divider,
    Icon,
    IconButton,
    IconName,
    IconProps,
    MotionBox,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useChannelsWithMentionCountsAndUnread } from 'hooks/useChannelsWithMentionCountsAndUnread'
import { useCreateLink } from 'hooks/useCreateLink'
import { PersistAndFadeWelcomeLogo } from 'routes/layouts/WelcomeLayout'
import { useStore } from 'store/store'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { AllChannelsList, ChannelItem } from '../AllChannelsList/AllChannelsList'
import { TouchTabBarLayout } from '../layouts/TouchTabBarLayout'
import { CheckValidSpaceOrInvite } from './CheckValidSpaceOrInvite'

const transition = {
    layout: { type: 'spring', duration: 0.4 },
}

const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

type Overlay = undefined | 'main-panel' | 'create-channel' | 'browse-channels'

export const TouchHome = () => {
    const space = useSpaceData()
    const { loggedInWalletAddress } = useAuth()
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>('')
    const [caretVisible, setCaretVisible] = useState<boolean>(false)
    const isLoadingChannels = space?.isLoadingChannels ?? true
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const members = useMemo(() => {
        return memberIds.map((userId) => usersMap[userId])
    }, [memberIds, usersMap])

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space?.id.streamId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const onFocus = useCallback(() => {
        setIsSearching(true)
        const timeout = setTimeout(() => {
            setCaretVisible(true)
        }, 500)
        return () => {
            clearTimeout(timeout)
        }
    }, [setIsSearching, setCaretVisible])

    const onCloseSearch = useCallback(() => {
        setIsSearching(false)
        setCaretVisible(false)
        setSearchString('')
    }, [setIsSearching, setCaretVisible])

    const onChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSearchString(event.target.value)
        },
        [setSearchString],
    )

    const onScroll = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    }

    const { channelsWithMentionCountsAndUnread } = useChannelsWithMentionCountsAndUnread()

    const filteredChannels = useMemo(() => {
        return fuzzysort
            .go(searchString, channelsWithMentionCountsAndUnread, { key: 'label', all: true })
            .map((m) => m.obj)
    }, [channelsWithMentionCountsAndUnread, searchString])

    const [unreadChannels, readChannels, unjoinedChannels] = useMemo(() => {
        return [
            filteredChannels.filter((c) => c.unread && c.isJoined),
            filteredChannels.filter((c) => !c.unread && c.isJoined),
            filteredChannels.filter((c) => !c.isJoined),
        ]
    }, [filteredChannels])

    const filteredMembers = useMemo(() => {
        return fuzzysort.go(searchString, members, { key: 'name', all: true }).map((m) => m.obj)
    }, [members, searchString])

    const [activeOverlay, setActiveOverlay] = useState<Overlay>(undefined)

    const onHideOverlay = useCallback(() => {
        setActiveOverlay(undefined)
    }, [])

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    const { imageSrc } = useImageSource(space?.id.streamId ?? '', ImageVariants.thumbnail300)

    const hasResult = filteredChannels.length > 0 || filteredMembers.length > 0

    const { createLink } = useCreateLink()
    const threadsLink = createLink({ route: 'threads' })
    const mentionsLink = createLink({ route: 'mentions' })
    const unreadThreadsCount = useSpaceThreadRootsUnreadCount()
    const unreadThreadMentions = useSpaceUnreadThreadMentions()

    const filteredMenuItems = useMemo(
        () =>
            fuzzysort.go(
                searchString,
                [
                    { name: 'threads', value: 'threads' },
                    { name: 'mentions', value: 'mentions' },
                ],
                { key: 'name', all: true },
            ),
        [searchString],
    )

    const displayThreadsItem =
        threadsLink && (!isSearching || filteredMenuItems.some((f) => f.obj.value === 'threads'))

    const displayMentionsItem =
        mentionsLink && (!isSearching || filteredMenuItems.some((f) => f.obj.value === 'mentions'))

    return (
        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
            <VisualViewportContextProvider>
                <TouchTabBarLayout>
                    <CheckValidSpaceOrInvite>
                        <AnimatePresence>
                            <BlurredBackground
                                height="x20"
                                imageSrc={imageSrc}
                                initial={{ filter: `blur(50px)` }}
                                animate={{ filter: 'blur(5px)', opacity: isSearching ? 0 : 1 }}
                            />
                            <MotionStack
                                absoluteFill
                                layout="position"
                                paddingTop="safeAreaInsetTop"
                                key="container"
                            >
                                {!isSearching && (
                                    <TouchLayoutHeader onDisplayMainPanel={onDisplayMainPanel} />
                                )}
                                <MotionStack
                                    horizontal
                                    paddingX
                                    layout="position"
                                    alignItems="center"
                                    paddingY="xs"
                                    gap="sm"
                                    animate={{
                                        caretColor: caretVisible
                                            ? vars.color.foreground.accent
                                            : 'rgba(0,0,0,0)',
                                    }}
                                    transition={transition}
                                    key="search_header"
                                >
                                    {!isLoadingChannels && (
                                        <TextField
                                            placeholder="Jump to..."
                                            height="x5"
                                            background="level2"
                                            value={searchString}
                                            onFocus={onFocus}
                                            onChange={onChange}
                                        />
                                    )}
                                    {isSearching && (
                                        <IconButton icon="close" onClick={onCloseSearch} />
                                    )}
                                </MotionStack>
                                <MotionBox
                                    scroll
                                    grow
                                    scrollbars
                                    layout="position"
                                    initial="initial"
                                    exit="exit"
                                    animate="animate"
                                    transition={transition}
                                    variants={variants}
                                    key="results"
                                    id={TouchScrollToTopScrollId.HomeTabScrollId}
                                    onScroll={onScroll}
                                >
                                    {!isLoadingChannels ? (
                                        <Box minHeight="forceScroll">
                                            <>
                                                {displayThreadsItem || displayMentionsItem ? (
                                                    <Spacer />
                                                ) : (
                                                    <></>
                                                )}
                                                {displayThreadsItem && (
                                                    <>
                                                        <TouchGenericResultRow
                                                            to={threadsLink}
                                                            title="Threads"
                                                            icon="message"
                                                            highlight={unreadThreadsCount > 0}
                                                            badgeCount={unreadThreadMentions}
                                                        />
                                                    </>
                                                )}
                                                {displayMentionsItem && (
                                                    <>
                                                        <TouchGenericResultRow
                                                            to={mentionsLink}
                                                            title="Mentions"
                                                            icon="at"
                                                        />
                                                    </>
                                                )}
                                            </>

                                            <Spacer />

                                            {space && unreadChannels.length > 0 && (
                                                <>
                                                    <SectionHeader title="Unread" />
                                                    <ChannelList
                                                        space={space}
                                                        channels={unreadChannels}
                                                    />
                                                </>
                                            )}
                                            {space && readChannels.length > 0 && (
                                                <>
                                                    <SectionHeader title="Channels" />
                                                    <ChannelList
                                                        key="a"
                                                        space={space}
                                                        channels={readChannels}
                                                    />
                                                    {isSearching && unjoinedChannels.length > 0 && (
                                                        <ChannelList
                                                            key="b"
                                                            space={space}
                                                            channels={unjoinedChannels}
                                                        />
                                                    )}
                                                </>
                                            )}

                                            <BrowseChannelRow
                                                onClick={() => setActiveOverlay('browse-channels')}
                                            />

                                            {canCreateChannel && (
                                                <CreateChannelRow
                                                    onClick={() =>
                                                        setActiveOverlay('create-channel')
                                                    }
                                                />
                                            )}

                                            {space && (
                                                <>
                                                    <SectionHeader title="Direct Messages" />
                                                    <DirectMessageChannelList />
                                                </>
                                            )}

                                            {filteredMembers.length > 0 && (
                                                <>
                                                    <Spacer />
                                                    <SectionHeader title="Members" />
                                                    <UserList members={filteredMembers} />
                                                </>
                                            )}

                                            {isSearching && searchString.length > 1 && (
                                                <>
                                                    {hasResult ? <Divider space="sm" /> : <></>}
                                                    <SearchForTermRow searchString={searchString} />
                                                </>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box absoluteFill centerContent>
                                            <ButtonSpinner />
                                        </Box>
                                    )}
                                </MotionBox>
                            </MotionStack>
                        </AnimatePresence>
                        <Outlet />
                    </CheckValidSpaceOrInvite>
                    {/* loading overlay, transition from home screen */}
                    <PersistAndFadeWelcomeLogo />
                </TouchTabBarLayout>
                <AnimatePresence>
                    {activeOverlay === 'main-panel' && <TouchHomeOverlay onClose={onHideOverlay} />}
                    {activeOverlay === 'create-channel' && space?.id && (
                        <CreateChannelFormModal spaceId={space.id} onHide={onHideOverlay} />
                    )}
                    {activeOverlay === 'browse-channels' && (
                        <ModalContainer touchTitle="Browse channels" onHide={onHideOverlay}>
                            <AllChannelsList onHideBrowseChannels={onHideOverlay} />
                        </ModalContainer>
                    )}
                </AnimatePresence>
            </VisualViewportContextProvider>
        </ErrorBoundary>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}

const ChannelList = (props: {
    space: SpaceData
    channels: {
        id: RoomIdentifier
        isJoined: boolean
        label: string
        mentionCount: number
        unread: boolean
        muted: boolean
    }[]
}) => {
    const { channels, space } = props
    return (
        <Stack>
            {channels.map((c) =>
                c.isJoined ? (
                    <TouchChannelResultRow
                        key={c.id.streamId}
                        channelNetworkId={c.id.streamId}
                        name={c.label}
                        unread={c.unread}
                        mentionCount={c.mentionCount}
                        muted={c.muted}
                    />
                ) : (
                    <Box paddingY="sm" paddingX="md" key={c.id.streamId}>
                        <ChannelContextProvider channelId={c.id}>
                            <ChannelItem
                                key={c.id.streamId}
                                space={space}
                                channelNetworkId={c.id.streamId}
                                name={c.label}
                            />
                        </ChannelContextProvider>
                    </Box>
                ),
            )}
        </Stack>
    )
}

const DirectMessageChannelList = () => {
    const { spaceDms, dmUnreadChannelIds } = useSpaceDms()

    return (
        <Stack>
            {spaceDms.map((c) => (
                <DirectMessageItem
                    key={c.id.streamId}
                    channel={c}
                    unread={dmUnreadChannelIds.has(c.id.streamId)}
                />
            ))}
        </Stack>
    )
}

const DirectMessageItem = (props: { channel: DMChannelIdentifier; unread: boolean }) => {
    const { channel, unread } = props
    const { unreadCount } = useDMLatestMessage(channel.id)
    return (
        <DMChannelContextUserLookupProvider
            fallbackToParentContext
            key={channel.id.streamId}
            channelId={channel.id.streamId}
        >
            <TouchChannelResultRow
                key={channel.id.streamId}
                channelNetworkId={channel.id.streamId}
                name={<DirectMessageName channel={channel} />}
                unread={unread}
                mentionCount={unreadCount}
                muted={false}
                icontElement={
                    <Box width="x4">
                        <DirectMessageIcon channel={channel} width="x4" />
                    </Box>
                }
            />
        </DMChannelContextUserLookupProvider>
    )
}

export const TouchChannelResultRow = (props: {
    channelNetworkId: string
    name: React.ReactNode
    unread: boolean
    mentionCount: number
    muted: boolean
    icontElement?: React.ReactNode
}) => {
    const { channelNetworkId, name, unread, mentionCount, muted } = props
    const { createLink } = useCreateLink()
    const link = createLink({ channelId: channelNetworkId })

    return (
        <NavItem to={link} padding="none">
            <NavItemContent
                key={channelNetworkId}
                fontWeight={unread ? 'strong' : 'normal'}
                color={unread ? 'default' : 'gray1'}
            >
                {props.icontElement ?? <SearchResultItemIcon type="tag" />}
                <Text truncate textAlign="left">
                    {name}
                </Text>
                <Box grow />
                {muted && <Icon type="muteActive" color="gray2" size="square_xs" />}
                {mentionCount > 0 && <Badge value={mentionCount}>{mentionCount}</Badge>}
                <SearchResultItemIcon type="arrowRight" background="inherit" color="gray2" />
            </NavItemContent>
        </NavItem>
    )
}

const UserList = (props: { members: RoomMember[] }) => {
    const { members } = props

    return (
        <Stack>
            {members.map((m) => (
                <TouchUserResultRow key={m.userId} member={m} />
            ))}
        </Stack>
    )
}

export const TouchUserResultRow = (props: { member: RoomMember }) => {
    const { member } = props
    const accountAddress = getAccountAddress(member.userId)
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: member.userId })

    return (
        <NavItem to={link} height="x6" padding="none">
            <NavItemContent key={member.userId}>
                <Stack horizontal gap="sm">
                    <Avatar size="avatar_x4" userId={member.userId} />
                    <Stack gap="sm" overflow="hidden" paddingY="xxs">
                        <Text truncate color="default">
                            {getPrettyDisplayName(member)}
                        </Text>
                        {accountAddress && (
                            <Paragraph truncate color="gray2" size="xs">
                                {accountAddress}
                            </Paragraph>
                        )}
                    </Stack>
                </Stack>
                <Box grow />
                <SearchResultItemIcon type="arrowRight" background="inherit" />
            </NavItemContent>
        </NavItem>
    )
}

const SectionHeader = (props: { title: string }) => {
    const { title } = props
    return (
        <Box paddingX paddingTop="md" paddingBottom="sm">
            <Text color="gray2">{title}</Text>
        </Box>
    )
}

const SearchForTermRow = (props: { searchString: string }) => {
    const { searchString } = props
    const navigate = useNavigate()
    const { createLink } = useCreateLink()
    const { setSearchTerms } = useStore(({ setSearchTerms }) => ({ setSearchTerms }))
    const onSeachTerm = useCallback(() => {
        const link = createLink({ route: 'search' })
        setSearchTerms(searchString)
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate, searchString, setSearchTerms])
    return (
        <Box paddingX="md" paddingY="sm">
            <Box horizontal gap="sm" alignItems="center">
                <SearchResultItemIcon type="search" />
                <Stack horizontal grow overflow="hidden" paddingY="sm" onClick={onSeachTerm}>
                    <Paragraph truncate color="gray1">
                        Search messages for &quot;
                        <span className={atoms({ fontWeight: 'medium', color: 'default' })}>
                            {searchString}
                        </span>
                        &quot;
                    </Paragraph>
                </Stack>
                <SearchResultItemIcon type="arrowRight" background="inherit" />
            </Box>
        </Box>
    )
}

const SearchResultItemIcon = ({ type, ...boxProps }: { type: IconProps['type'] } & BoxProps) => (
    <Box
        centerContent
        shrink={false}
        square="square_lg"
        background="level3"
        rounded="sm"
        color="inherit"
        {...boxProps}
    >
        <Icon type={type} size="square_sm" />
    </Box>
)

export const TouchGenericResultRow = (props: {
    to: string
    title: string
    icon: IconName
    highlight?: boolean
    badgeCount?: number
}) => {
    return (
        <NavItem to={props.to} padding="none">
            <NavItemContent>
                <SearchResultItemIcon type={props.icon} color="default" />
                <Stack gap="sm" overflow="hidden" paddingY="xxs">
                    <Text
                        truncate
                        fontWeight={props.highlight ? 'strong' : undefined}
                        color={props.highlight ? 'default' : 'gray1'}
                    >
                        {props.title}
                    </Text>
                </Stack>
                <Box grow />
                {(props?.badgeCount ?? 0) > 0 && (
                    <Badge value={props.badgeCount}>{props.badgeCount}</Badge>
                )}
                <SearchResultItemIcon type="arrowRight" background="inherit" />
            </NavItemContent>
        </NavItem>
    )
}

const CreateChannelRow = (props: { onClick: () => void }) => {
    return (
        <NavItem padding="none" onClick={props.onClick}>
            <NavItemContent>
                <SearchResultItemIcon type="plus" color="default" />
                <Text color="gray1">Create channel</Text>
            </NavItemContent>
        </NavItem>
    )
}

const BrowseChannelRow = (props: { onClick: () => void }) => {
    return (
        <NavItem padding="none" onClick={props.onClick}>
            <NavItemContent>
                <SearchResultItemIcon type="search" color="default" />
                <Text color="gray1">Browse channels</Text>
            </NavItemContent>
        </NavItem>
    )
}

const NavItemContent = (props: BoxProps) => (
    <Stack
        horizontal
        paddingX="sm"
        alignItems="center"
        width="100%"
        gap="sm"
        overflowX="hidden"
        {...props}
    />
)

const Spacer = () => <Box height="x2" />
