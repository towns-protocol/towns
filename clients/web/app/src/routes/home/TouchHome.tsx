import React, { useCallback, useMemo, useState } from 'react'
import {
    RoomMember,
    SpaceData,
    createUserIdFromString,
    useSpaceData,
    useSpaceMembers,
} from 'use-zion-client'
import { ErrorBoundary } from '@sentry/react'
import { AnimatePresence } from 'framer-motion'
import { Outlet } from 'react-router'
import fuzzysort from 'fuzzysort'

import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import {
    Avatar,
    Badge,
    Box,
    Heading,
    Icon,
    IconButton,
    MotionBox,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'
import { NavItem } from '@components/NavItem/_NavItem'
import { useCreateLink } from 'hooks/useCreateLink'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { VisualKeyboardContextProvider } from '@components/VisualKeyboardContext/VisualKeyboardContext'
import { useChannelsWithMentionCountsAndUnread } from 'hooks/useChannelsWithMentionCountsAndUnread'
import { TouchTabBarLayout } from '../layouts/TouchTabBarLayout'
import { ChannelItem } from '../AllChannelsList/AllChannelsList'
import { CheckValidSpaceOrInvite } from './CheckValidSpaceOrInvite'

const transition = {
    layout: { type: 'spring', duration: 0.4 },
}

const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

type Overlay = undefined | 'main-panel' | 'direct-messages'

export const TouchHome = () => {
    const space = useSpaceData()
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>('')
    const [caretVisible, setCaretVisible] = useState<boolean>(false)
    const isLoadingChannels = space?.isLoadingChannels ?? true
    const { members } = useSpaceMembers()

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
            .go(searchString, channelsWithMentionCountsAndUnread, { key: 'name', all: true })
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

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    return (
        <ErrorBoundary fallback={ErrorFallbackComponent}>
            <VisualKeyboardContextProvider>
                <TouchTabBarLayout>
                    <CheckValidSpaceOrInvite>
                        <AnimatePresence>
                            <BlurredBackground
                                spaceSlug={space?.id.slug ?? ''}
                                hidden={isSearching}
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
                                    animate={{ caretColor: caretVisible ? 'auto' : 'transparent' }}
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
                                    onScroll={onScroll}
                                >
                                    {!isLoadingChannels ? (
                                        <>
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
                                            {filteredMembers.length > 0 && (
                                                <>
                                                    <SectionHeader title="Members" />
                                                    <UserList members={filteredMembers} />
                                                </>
                                            )}
                                            {isSearching &&
                                                searchString.length > 0 &&
                                                filteredChannels.length === 0 &&
                                                readChannels.length === 0 &&
                                                filteredMembers.length === 0 && (
                                                    <NoResults searchString={searchString} />
                                                )}
                                        </>
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
                </TouchTabBarLayout>
                <AnimatePresence>
                    {activeOverlay === 'main-panel' && (
                        <TouchHomeOverlay onClose={() => setActiveOverlay(undefined)} />
                    )}
                </AnimatePresence>
            </VisualKeyboardContextProvider>
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
        channelNetworkId: string
        isJoined: boolean
        name: string
        mentionCount: number
        unread: boolean
        muted: boolean
    }[]
}) => {
    const { channels, space } = props
    return (
        <Stack paddingX="sm">
            {channels.map((c) =>
                c.isJoined ? (
                    <ChannelRow
                        key={c.channelNetworkId}
                        channelNetworkId={c.channelNetworkId}
                        name={c.name}
                        unread={c.unread}
                        mentionCount={c.mentionCount}
                        muted={c.muted}
                    />
                ) : (
                    <Box padding="sm" key={c.channelNetworkId}>
                        <ChannelItem
                            key={c.channelNetworkId}
                            space={space}
                            channelNetworkId={c.channelNetworkId}
                            isJoined={c.isJoined}
                            name={c.name}
                        />
                    </Box>
                ),
            )}
        </Stack>
    )
}

const ChannelRow = (props: {
    channelNetworkId: string
    name: string
    unread: boolean
    mentionCount: number
    muted: boolean
}) => {
    const { channelNetworkId, name, unread, mentionCount, muted } = props

    return (
        <NavItem to={`channels/${channelNetworkId}`} padding="none">
            <Stack
                horizontal
                alignItems="center"
                key={channelNetworkId}
                width="100%"
                gap="sm"
                overflowX="hidden"
                fontWeight={unread ? 'strong' : 'normal'}
            >
                <Icon
                    type="tag"
                    padding="line"
                    background="level2"
                    size="square_lg"
                    color={unread ? 'default' : 'gray1'}
                />
                <Text truncate color={unread ? 'default' : 'gray1'} textAlign="left">
                    {name}
                </Text>
                <Box grow />
                {muted && <Icon type="muteActive" color="gray2" size="square_xs" />}
                {mentionCount > 0 && <Badge value={mentionCount}>{mentionCount}</Badge>}
                <Icon type="arrowRight" color="gray2" />
            </Stack>
        </NavItem>
    )
}

const UserList = (props: { members: RoomMember[] }) => {
    const { members } = props

    return (
        <Stack minHeight="forceScroll">
            {members.map((m) => (
                <UserRow key={m.userId} member={m} />
            ))}
        </Stack>
    )
}

const UserRow = (props: { member: RoomMember }) => {
    const { member } = props
    const accountAddress = createUserIdFromString(member.userId)?.accountAddress
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: member.userId })

    return (
        <NavItem to={link} height="x6">
            <Stack
                horizontal
                gap="sm"
                key={member.userId}
                paddingY="sm"
                alignItems="center"
                width="100%"
            >
                <Avatar size="avatar_x4" userId={member.userId} />
                <Stack gap="sm">
                    <Text fontWeight="strong" size="sm" color="default">
                        {getPrettyDisplayName(member).initialName}
                    </Text>
                    {accountAddress && (
                        <Text truncate color="gray2" size="sm">
                            {shortAddress(accountAddress)}
                        </Text>
                    )}
                </Stack>
                <Box grow />
                <Icon type="arrowRight" color="gray2" />
            </Stack>
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

const NoResults = (props: { searchString: string }) => {
    const { searchString } = props
    return (
        <Box centerContent position="relative" paddingTop="x8">
            <Heading level={3}>No results</Heading>
            <Paragraph textAlign="center" color="gray2">
                No results for &quot;<strong>{searchString}</strong>&quot;
            </Paragraph>
        </Box>
    )
}
