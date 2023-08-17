import React, { useCallback, useMemo, useState } from 'react'
import {
    RoomMember,
    SpaceData,
    createUserIdFromString,
    useSpaceData,
    useSpaceMembers,
    useSpaceMentions,
} from 'use-zion-client'
import { ErrorBoundary } from '@sentry/react'
import { AnimatePresence } from 'framer-motion'
import { Outlet } from 'react-router'
import fuzzysort from 'fuzzysort'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { Avatar, Box, Icon, IconButton, MotionBox, MotionStack, Stack, Text, TextField } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'
import { NavItem } from '@components/NavItem/_NavItem'
import { useCreateLink } from 'hooks/useCreateLink'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { useContractChannelsWithJoinedStatus } from 'hooks/useContractChannelsWithJoinedStatus'
import { VisualKeyboardContextProvider } from '@components/VisualKeyboardContext/VisualKeyboardContext'
import { TouchTabBarLayout } from '../layouts/TouchTabBarLayout'
import { ChannelItem } from '../AllChannelsList/AllChannelsList'
import { CheckValidSpaceOrInvite } from './CheckValidSpaceOrInvite'

const transition = {
    duration: 0.5,
    ease: 'easeIn',
}

const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

type Overlay = undefined | 'main-panel' | 'direct-messages'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>('')
    const [caretVisible, setCaretVisible] = useState<boolean>(false)
    const isLoadingChannels = space?.isLoadingChannels ?? true
    const { members } = useSpaceMembers()
    const { contractChannelsWithJoinedStatus } = useContractChannelsWithJoinedStatus()

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

    const filteredMembers = useMemo(() => {
        return fuzzysort.go(searchString, members, { key: 'name', all: true }).map((m) => m.obj)
    }, [members, searchString])

    const filteredChannels = useMemo(() => {
        return fuzzysort
            .go(searchString, contractChannelsWithJoinedStatus, { key: 'name', all: true })
            .map((m) => m.obj)
    }, [contractChannelsWithJoinedStatus, searchString])

    const [activeOverlay, setActiveOverlay] = useState<Overlay>(undefined)

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    return (
        <ErrorBoundary fallback={ErrorFallbackComponent}>
            <VisualKeyboardContextProvider>
                <TouchTabBarLayout>
                    <CheckValidSpaceOrInvite>
                        {!isSearching && <BlurredBackground spaceSlug={space?.id.slug ?? ''} />}
                        <AnimatePresence>
                            <MotionStack absoluteFill layout paddingTop="safeAreaInsetTop">
                                {!isSearching && (
                                    <TouchLayoutHeader onDisplayMainPanel={onDisplayMainPanel} />
                                )}
                                <MotionStack
                                    horizontal
                                    layout
                                    paddingX
                                    alignItems="center"
                                    paddingY="xs"
                                    gap="sm"
                                    animate={{ caretColor: caretVisible ? 'auto' : 'transparent' }}
                                >
                                    <TextField
                                        placeholder="Jump to..."
                                        height="x5"
                                        background="level2"
                                        value={searchString}
                                        onFocus={onFocus}
                                        onChange={onChange}
                                    />
                                    {isSearching && (
                                        <IconButton icon="close" onClick={onCloseSearch} />
                                    )}
                                </MotionStack>
                                <Box scroll grow scrollbars={isSearching} onScroll={onScroll}>
                                    {isSearching ? (
                                        <>
                                            {space && filteredChannels.length > 0 && (
                                                <ChannelList
                                                    space={space}
                                                    channels={filteredChannels}
                                                />
                                            )}
                                            <UserList members={filteredMembers} />
                                        </>
                                    ) : (
                                        <MotionBox
                                            minHeight="forceScroll"
                                            variants={variants}
                                            initial="initial"
                                            exit="exit"
                                            animate="animate"
                                            transition={transition}
                                        >
                                            {space && !isLoadingChannels ? (
                                                <SyncedChannelList
                                                    space={space}
                                                    mentions={mentions}
                                                    canCreateChannel={false}
                                                />
                                            ) : (
                                                <Box absoluteFill centerContent>
                                                    <ButtonSpinner />
                                                </Box>
                                            )}
                                        </MotionBox>
                                    )}
                                </Box>
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
    channels: { channelNetworkId: string; isJoined: boolean; name: string }[]
}) => {
    const { channels, space } = props
    return (
        <MotionStack
            paddingTop="md"
            initial="initial"
            paddingX="sm"
            exit="exit"
            animate="animate"
            transition={transition}
            variants={variants}
        >
            {channels.map((c) =>
                c.isJoined ? (
                    <ChannelRow
                        key={c.channelNetworkId}
                        channelNetworkId={c.channelNetworkId}
                        name={c.name}
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
        </MotionStack>
    )
}

const ChannelRow = (props: { channelNetworkId: string; name: string }) => {
    const { channelNetworkId, name } = props

    return (
        <NavItem to={`channels/${channelNetworkId}`} padding="none">
            <Stack
                horizontal
                alignItems="center"
                key={channelNetworkId}
                width="100%"
                gap="sm"
                overflowX="hidden"
            >
                <Icon type="tag" padding="line" background="level2" size="square_lg" />
                <Text truncate color="gray1" textAlign="left">
                    {name}
                </Text>
                <Box grow />
                <Icon type="arrowRight" color="gray2" />
            </Stack>
        </NavItem>
    )
}

const UserList = (props: { members: RoomMember[] }) => {
    const { members } = props
    return (
        <MotionStack
            minHeight="forceScroll"
            initial="initial"
            exit="exit"
            animate="animate"
            transition={transition}
            variants={variants}
        >
            {members.map((m) => (
                <UserRow key={m.userId} member={m} />
            ))}
        </MotionStack>
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
