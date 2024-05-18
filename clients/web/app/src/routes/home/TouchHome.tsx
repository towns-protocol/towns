import { AnimatePresence } from 'framer-motion'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutlet } from 'react-router'
import {
    Address,
    ChannelContextProvider,
    DMChannelContextUserLookupProvider,
    Membership,
    Permission,
    RoomMember,
    SpaceData,
    useConnectivity,
    useDMLatestMessage,
    useHasPermission,
    useMyMemberships,
    useSpaceData,
    useSpaceMembers,
    useSpaceThreadRootsUnreadCount,
    useSpaceUnreadThreadMentions,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import {
    DirectMessageIcon,
    DirectMessageName,
} from '@components/DirectMessages/DirectMessageListItem'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { NavItem } from '@components/NavItem/_NavItem'
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
import { useCreateLink } from 'hooks/useCreateLink'
import { useStore } from 'store/store'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { DMChannelMenuItem, MixedChannelMenuItem, useSortedChannels } from 'hooks/useSortedChannels'
import { notUndefined } from 'ui/utils/utils'
import { ShakeToReport } from '@components/BugReportButton/ShakeToReport'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'
import { BrowseChannelsPanel } from '@components/BrowseChannelsPanel/BrowseChannelsPanel'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'
import { usePanels } from 'routes/layouts/hooks/usePanels'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { replaceOAuthParameters, useAnalytics } from 'hooks/useAnalytics'
import { PATHS } from 'routes'
import { ChannelItem } from '../AllChannelsList/AllChannelsList'
import { TouchTabBarLayout } from '../layouts/TouchTabBarLayout'

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
    const { isAuthenticated, loggedInWalletAddress, loginStatus } = useConnectivity()
    const { signerContext } = useTownsContext()
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>('')
    const [caretVisible, setCaretVisible] = useState<boolean>(false)
    const isLoadingChannels = space?.isLoadingChannels ?? true
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const navigate = useNavigate()
    const visitedBookmark = useRef<string>()
    const members = useMemo(() => {
        return memberIds.map((userId) => usersMap[userId]).filter(notUndefined)
    }, [memberIds, usersMap])

    const { unseenChannelIds, markChannelsAsSeen } = useUnseenChannelIds()
    const spaceId = space?.id ?? ''
    const hasSignerContext = signerContext !== undefined

    const { storeBookmarkedSpaceId, storeBookmarkedRoute } = useStore((s) => {
        const storeBookmarkedSpaceId = s.spaceIdBookmark
        const storeBookmarkedRoute = storeBookmarkedSpaceId
            ? s.townRouteBookmarks[storeBookmarkedSpaceId]
            : undefined
        return {
            storeBookmarkedSpaceId,
            storeBookmarkedRoute,
        }
    })

    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { hasPermission: canCreateChannel } = useHasPermission({
        spaceId: space?.id,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const { analytics, anonymousId, pseudoId, setPseudoId } = useAnalytics()

    useEffect(() => {
        console.warn('[TouchHome][hnt-5685]', 'route', {
            spaceId,
            loggedInWalletAddress: loggedInWalletAddress ?? '',
            loginStatus,
            isAuthenticated,
            hasSignerContext,
            locationPathname: location.pathname,
            locationSearch: location.search,
            storeBookmarkedRoute: storeBookmarkedRoute ?? 'undefined',
            storeBookmarkedSpaceId: storeBookmarkedSpaceId ?? 'undefined',
            visitedBookmark: visitedBookmark.current ?? 'undefined',
        })
    }, [
        isAuthenticated,
        loggedInWalletAddress,
        loginStatus,
        hasSignerContext,
        spaceId,
        storeBookmarkedRoute,
        storeBookmarkedSpaceId,
    ])

    useEffect(() => {
        if (pseudoId === undefined && loggedInWalletAddress && abstractAccountAddress) {
            const pId = setPseudoId(loggedInWalletAddress)
            analytics?.identify(
                pId,
                {
                    abstractAccountAddress,
                    anonymousId,
                    loggedInWalletAddress,
                    pseudoId: pId,
                },
                () => {
                    console.log('[analytics][TouchHome] identify logged in user')
                },
            )
        }
    }, [
        abstractAccountAddress,
        analytics,
        anonymousId,
        loggedInWalletAddress,
        pseudoId,
        setPseudoId,
    ])

    useEffect(() => {
        analytics?.page(
            'authenticated-page',
            'Home',
            {
                path: `${PATHS.SPACES}/${spaceId}`,
                spaceId,
                locationPathname: location.pathname,
                locationSearch: replaceOAuthParameters(location.search),
                anonymousId,
            },
            () => {
                console.log('[analytics] Home')
            },
        )
    }, [analytics, anonymousId, spaceId])

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

    const { unreadChannels, readChannels, readDms, unjoinedChannels, favoriteChannels } =
        useSortedChannels({
            spaceId: space?.id ?? '',
        })

    const { filteredUnreadChannels, filteredReadChannels, filteredDms, filteredFavoriteChannels } =
        useMemo(() => {
            return {
                filteredUnreadChannels: fuzzysort
                    .go(searchString, unreadChannels, { keys: ['label', 'search'], all: true })
                    .map((m) => m.obj),
                filteredReadChannels: fuzzysort
                    .go(
                        searchString,
                        [...readChannels, ...(searchString ? unjoinedChannels : [])].filter(
                            notUndefined,
                        ),
                        {
                            keys: ['label', 'search'],
                            all: true,
                        },
                    )
                    .map((m) => m.obj),
                filteredDms: fuzzysort
                    .go(searchString, readDms, { keys: ['label', 'search'], all: true })
                    .map((m) => m.obj),
                filteredFavoriteChannels: fuzzysort
                    .go(searchString, favoriteChannels, { keys: ['label', 'search'], all: true })
                    .map((m) => m.obj),
            }
        }, [
            readChannels,
            readDms,
            searchString,
            unjoinedChannels,
            unreadChannels,
            favoriteChannels,
        ])

    const filteredMembers = useMemo(() => {
        if (searchString.length === 0) {
            return []
        }
        return fuzzysort
            .go(searchString, members, { keys: ['username', 'displayName'], limit: 10 })
            .map((m) => m.obj)
    }, [members, searchString])

    const [activeOverlay, setActiveOverlay] = useState<Overlay>(undefined)

    const onHideOverlay = useCallback(() => {
        setActiveOverlay(undefined)
    }, [])

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    const onHideBrowseChannels = useCallback(() => {
        markChannelsAsSeen()
        onHideOverlay()
    }, [onHideOverlay, markChannelsAsSeen])

    const { imageSrc } = useImageSource(space?.id ?? '', ImageVariants.thumbnail300)

    const hasResult = filteredUnreadChannels.length > 0 || filteredReadChannels.length > 0

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

    const { openPanel } = usePanelActions()
    const openCreateChannelPanel = useCallback(() => {
        openPanel('create-channel')
    }, [openPanel])

    useEffect(() => {
        if (visitedBookmark.current) {
            return
        }
        if (storeBookmarkedSpaceId && storeBookmarkedRoute) {
            visitedBookmark.current = storeBookmarkedRoute
            console.log('[TouchHome][hnt-5685]', 'visited bookmark', {
                storeBookmarkedSpaceId,
                storeBookmarkedRoute,
            })
            navigate(storeBookmarkedRoute)
        }
    }, [navigate, storeBookmarkedRoute, storeBookmarkedSpaceId])

    return (
        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
            <ShakeToReport />
            <VisualViewportContextProvider>
                <TouchTabBarLayout>
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
                                        disabled={activeOverlay !== undefined}
                                        onFocus={onFocus}
                                        onChange={onChange}
                                    />
                                )}
                                {isSearching && <IconButton icon="close" onClick={onCloseSearch} />}
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
                                {isLoadingChannels ? (
                                    <Box absoluteFill centerContent>
                                        <ButtonSpinner />
                                    </Box>
                                ) : (
                                    <Box minHeight="forceScroll">
                                        <>
                                            {displayThreadsItem || displayMentionsItem ? (
                                                <Spacer />
                                            ) : (
                                                <></>
                                            )}
                                            {displayThreadsItem && (
                                                <TouchGenericResultRow
                                                    to={threadsLink}
                                                    title="Threads"
                                                    icon="message"
                                                    highlight={unreadThreadsCount > 0}
                                                    badgeCount={unreadThreadMentions}
                                                />
                                            )}
                                            {displayMentionsItem && (
                                                <TouchGenericResultRow
                                                    to={mentionsLink}
                                                    title="Mentions"
                                                    icon="at"
                                                />
                                            )}
                                        </>

                                        <Spacer />

                                        {space && (
                                            <>
                                                <ChannelList
                                                    label="Unread"
                                                    channelItems={filteredUnreadChannels}
                                                    space={space}
                                                />
                                                <ChannelList
                                                    label="Favorites"
                                                    channelItems={filteredFavoriteChannels}
                                                    space={space}
                                                />
                                                <ChannelList
                                                    label="Channels"
                                                    channelItems={filteredReadChannels}
                                                    space={space}
                                                />
                                                <BrowseChannelRow
                                                    badgeCount={unseenChannelIds.size}
                                                    onClick={() =>
                                                        setActiveOverlay('browse-channels')
                                                    }
                                                />
                                                {canCreateChannel && (
                                                    <CreateChannelRow
                                                        onClick={openCreateChannelPanel}
                                                    />
                                                )}
                                                {filteredDms.length > 0 && (
                                                    <ChannelList
                                                        label="Direct Messages"
                                                        channelItems={filteredDms}
                                                        space={space}
                                                    />
                                                )}

                                                {filteredMembers.length > 0 && (
                                                    <>
                                                        <Spacer />
                                                        <SectionHeader title="Members" />
                                                        <UserList members={filteredMembers} />
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {isSearching && searchString.length > 1 && (
                                            <>
                                                {hasResult ? <Divider space="sm" /> : <></>}
                                                <SearchForTermRow searchString={searchString} />
                                            </>
                                        )}
                                    </Box>
                                )}
                                {(!env.DEV || env.VITE_PUSH_NOTIFICATION_ENABLED) && (
                                    <ReloadPrompt />
                                )}
                            </MotionBox>
                        </MotionStack>
                    </AnimatePresence>

                    <OutletOrPanel />
                </TouchTabBarLayout>
                <AnimatePresence>
                    {activeOverlay === 'main-panel' && <TouchHomeOverlay onClose={onHideOverlay} />}
                    {activeOverlay === 'create-channel' && space?.id && (
                        <CreateChannelFormModal spaceId={space.id} onHide={onHideOverlay} />
                    )}
                    {activeOverlay === 'browse-channels' && (
                        <ModalContainer touchTitle="Browse channels" onHide={onHideBrowseChannels}>
                            <BrowseChannelsPanel onClose={onHideBrowseChannels} />
                        </ModalContainer>
                    )}
                </AnimatePresence>
            </VisualViewportContextProvider>
        </ErrorBoundary>
    )
}

const OutletOrPanel = () => {
    const outlet = useOutlet()
    const panel = usePanels()

    return (
        <>
            {/* base path defined by route (home/dms/profile) */}
            {outlet}
            {/* defined by params (i.e. ?panel=) */}
            {panel}
        </>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}

const ChannelList = React.memo(
    (props: { label?: string; channelItems: MixedChannelMenuItem[]; space: SpaceData }) => {
        const { channelItems, label, space } = props
        const myMemberships = useMyMemberships()

        if (channelItems.length === 0) {
            return <></>
        }

        const items = channelItems.map((c) =>
            c.type === 'dm' ? (
                <DirectMessageItem key={c.id} dm={c} unread={c.unread} />
            ) : c.joined ? (
                <TouchChannelResultRow
                    key={c.id}
                    itemLink={{ channelId: c.id }}
                    name={c.channel.label}
                    unread={c.unread}
                    mentionCount={c.mentionCount}
                    muted={false}
                />
            ) : (
                <Box paddingY="sm" paddingX="md" key={c.id}>
                    <ChannelContextProvider channelId={c.id}>
                        <ChannelItem
                            key={c.id}
                            space={space}
                            channelNetworkId={c.id}
                            name={c.channel.label}
                            isJoined={myMemberships[c.id] === Membership.Join}
                        />
                    </ChannelContextProvider>
                </Box>
            ),
        )

        return (
            <>
                {label && <SectionHeader title={label} />}
                {items}
            </>
        )
    },
)

const DirectMessageItem = (props: { dm: DMChannelMenuItem; unread: boolean }) => {
    const { dm, unread } = props
    const { unreadCount } = useDMLatestMessage(dm.id)
    return (
        <DMChannelContextUserLookupProvider fallbackToParentContext key={dm.id} channelId={dm.id}>
            <TouchChannelResultRow
                key={dm.id}
                itemLink={{ messageId: dm.id }}
                name={
                    <DirectMessageName
                        channelId={dm.channel.id}
                        label={dm.channel.properties?.name}
                    />
                }
                unread={unread}
                mentionCount={unreadCount}
                muted={false}
                icontElement={
                    <Box width="x4">
                        <DirectMessageIcon channel={dm.channel} width="x4" />
                    </Box>
                }
            />
        </DMChannelContextUserLookupProvider>
    )
}

export const TouchChannelResultRow = (props: {
    itemLink: { channelId: string } | { messageId: string }
    name: React.ReactNode
    unread: boolean
    mentionCount: number
    muted: boolean
    icontElement?: React.ReactNode
}) => {
    const { itemLink, name, unread, mentionCount, muted } = props
    const { createLink } = useCreateLink()
    const link =
        createLink(
            'channelId' in itemLink
                ? { channelId: itemLink.channelId }
                : { messageId: itemLink.messageId },
        ) + `?ref=home`

    return (
        <NavItem to={link} padding="none">
            <NavItemContent
                key={link}
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
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: member.userId as Address | undefined,
    })
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: abstractAccountAddress })

    return (
        <NavItem to={link} height="x6" padding="none">
            <NavItemContent key={member.userId}>
                <Stack horizontal centerContent gap="sm">
                    <Avatar size="avatar_x4" userId={member.userId} />

                    <Text truncate color="default">
                        {getPrettyDisplayName(member)}
                    </Text>
                </Stack>
                <Box grow />
                <SearchResultItemIcon type="arrowRight" background="inherit" />
            </NavItemContent>
        </NavItem>
    )
}

const SectionHeader = (props: { title: string; children?: React.ReactNode }) => {
    const { title } = props
    return (
        <Box paddingX horizontal paddingTop="md" paddingBottom="sm" alignItems="center">
            <Text color="gray2">{title}</Text>

            {props.children ? (
                <Box grow horizontal justifyContent="end">
                    {props.children}
                </Box>
            ) : (
                <></>
            )}
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

const BrowseChannelRow = (props: { onClick: () => void; badgeCount?: number }) => {
    console.log(props.badgeCount, 'props.badgeCount')
    return (
        <NavItem padding="none" onClick={props.onClick}>
            <NavItemContent>
                <SearchResultItemIcon type="search" color="default" />
                <Text color="gray1">Browse channels</Text>
                {props.badgeCount && props.badgeCount > 0 ? (
                    <Badge value={props.badgeCount} />
                ) : (
                    <></>
                )}
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

const Spacer = () => <Box minHeight="x2" width="x2" />
