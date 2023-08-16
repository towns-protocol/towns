import React, { useCallback, useMemo, useState } from 'react'
import {
    RoomMember,
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
import { TouchTabBarLayout } from './layouts/TouchTabBarLayout'

type Overlay = undefined | 'main-panel' | 'direct-messages'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()
    const spaceData = useSpaceData()
    const [isSearching, setIsSearching] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>('')
    const [caretVisible, setCaretVisible] = useState<boolean>(false)
    const isLoadingChannels = spaceData?.isLoadingChannels ?? true
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

    const filteredMembers = useMemo(() => {
        return fuzzysort.go(searchString, members, { key: 'name', all: true }).map((m) => m.obj)
    }, [members, searchString])

    const [activeOverlay, setActiveOverlay] = useState<Overlay>(undefined)

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    return (
        <ErrorBoundary fallback={ErrorFallbackComponent}>
            <TouchTabBarLayout>
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
                            {isSearching && <IconButton icon="close" onClick={onCloseSearch} />}
                        </MotionStack>
                        <Box scroll grow onScroll={onScroll}>
                            {isSearching ? (
                                <UserList members={filteredMembers} />
                            ) : (
                                <MotionBox
                                    minHeight="forceScroll"
                                    initial={{ opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, ease: 'easeIn' }}
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
            </TouchTabBarLayout>
            <AnimatePresence>
                {activeOverlay === 'main-panel' && (
                    <TouchHomeOverlay onClose={() => setActiveOverlay(undefined)} />
                )}
            </AnimatePresence>
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

const UserList = (props: { members: RoomMember[] }) => {
    const { members } = props
    return (
        <MotionStack
            minHeight="forceScroll"
            paddingTop="xs"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeIn', delay: 0.2 }}
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
                <Avatar size="avatar_sm" userId={member.userId} />
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
