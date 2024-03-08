import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import {
    ChannelContextProvider,
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    LookupUser,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { FadeInBox } from '@components/Transitions'
import { UserList } from '@components/UserList/UserList'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { Box, Button, Icon, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { SpacesChannelComponent } from 'routes/SpacesChannel'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'
import { ChannelPlaceholder } from './ChannelPlaceholder'
import { MessageDropDown } from './MessageDropDown'
import { UserOption, UserPillSelector } from './UserPillSelector'
import { useCreateDirectMessage } from './hooks/useCreateDirectMessage'
import { useMatchingMessages } from './hooks/useMatchingMessages'

type Props = {
    onDirectMessageCreated?: () => void
}

export const CreateMessagePanel = () => {
    const { isTouch } = useDevice()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const onClose = useCallback(() => {
        if (searchParams.get('ref')) {
            navigate(-1)
        } else {
            const link = createLink({ route: 'townHome' })
            if (link) {
                navigate(link)
            }
        }
    }, [createLink, navigate, searchParams])

    const panel = (
        <>
            <Panel
                paddingX={isTouch ? undefined : 'lg'}
                label={
                    <Text strong color="default" size="lg">
                        New Message
                    </Text>
                }
                background="level1"
                onClose={onClose}
            >
                <CreateDirectMessage />
            </Panel>
            <Outlet />
        </>
    )

    // TODO: central panel layout includes animation on touch
    return isTouch ? panel : <CentralPanelLayout>{panel}</CentralPanelLayout>
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props

    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const { createLink } = useCreateLink()
    const { usersMap } = useUserLookupContext()

    const { dmChannels } = useTownsContext()

    const [selectedUsers, setSelectedIds] = useState(() => new Set<string>())
    const selectedUserArray = useMemo(() => Array.from(selectedUsers), [selectedUsers])
    const numSelectedUsers = selectedUserArray.length

    const { inclusiveMatches, matchingDM, matchingGDM } = useMatchingMessages({
        selectedUserArray,
        dmChannels,
    })

    const { onSubmit, isSubmitting } = useCreateDirectMessage({
        selectedIdsArray: selectedUserArray,
        matchingChannel: inclusiveMatches.length === 1 ? inclusiveMatches[0] : undefined,
        onDirectMessageCreated,
    })

    const onSelectionChange = useCallback((userIds: Set<string>) => {
        setSelectedIds(userIds)
    }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                navigate(-1)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [navigate])

    const onSelectChannel = useCallback(
        (channelId?: string) => {
            if (!channelId) {
                return
            }

            const link = createLink({ messageId: channelId })
            if (link) {
                navigate(link)
            }
        },
        [createLink, navigate],
    )

    // preview a channel when selecting first user from dropdown
    const [userPreview, setUserPreview] = useState<string | undefined>(undefined)

    // preview a channel when seleting from message dropdown
    const [userChannelPreview, setUserChannelPreview] = useState<DMChannelIdentifier | undefined>()

    const onUserPreviewChange = (user: LookupUser | undefined) => {
        if (user) {
            setUserPreview(user?.userId)
            const matchingChannel = user?.userId
                ? dmChannels.find((dm) => !dm.isGroup && dm.userIds.includes(user?.userId))
                : undefined

            setUserChannelPreview(matchingChannel)
        }
    }

    const createCTA = useMemo(
        () =>
            !numSelectedUsers ? undefined : numSelectedUsers === 1 ? (
                matchingDM ? undefined : (
                    <Stack horizontal grow gap="sm" alignItems="center">
                        <UserOption
                            user={usersMap[Array.from(selectedUsers).at(0)]}
                            selected={false}
                        />
                    </Stack>
                )
            ) : isTouch ? (
                <Box grow>
                    <Button>Create {matchingGDM.length > 0 ? 'new' : ''} group</Button>
                </Box>
            ) : (
                <Stack horizontal grow gap="sm" alignItems="center">
                    <Box
                        border
                        centerContent
                        width="x4"
                        height="x4"
                        background="level3"
                        rounded="full"
                        shrink={false}
                    >
                        <Icon type="message" size="square_xs" />
                    </Box>
                    <Paragraph color="gray1">
                        Create {matchingGDM.length > 0 ? 'new' : ''} group with{' '}
                        <Text color="default" display="inline" as="span">
                            {<UserList excludeSelf userIds={Array.from(selectedUsers)} />}
                        </Text>
                    </Paragraph>
                </Stack>
            ),
        [isTouch, matchingDM, matchingGDM.length, numSelectedUsers, selectedUsers, usersMap],
    )

    const emptySelectionElement = useCallback(
        ({ searchTerm }: { searchTerm: string }) => {
            return searchTerm?.length && !inclusiveMatches?.length ? (
                <Box
                    padding
                    horizontal
                    gap="sm"
                    background="level2"
                    height="x7"
                    alignItems="center"
                    rounded="sm"
                    color="gray2"
                >
                    <Icon type="alert" size="square_xs" />
                    <Paragraph>No matches for &quot;{searchTerm}&quot;</Paragraph>
                </Box>
            ) : numSelectedUsers > 1 ? (
                <MessageDropDown
                    createNewCTA={createCTA}
                    channels={inclusiveMatches}
                    onCreateNew={onSubmit}
                    onSelectChannel={onSelectChannel}
                    onFocusChange={(channel: DMChannelIdentifier) => setChannelPreview(channel)}
                />
            ) : (
                <></>
            )
        },
        [createCTA, inclusiveMatches, numSelectedUsers, onSubmit, onSelectChannel],
    )

    const [channelPreview, setChannelPreview] = useState<DMChannelIdentifier | undefined>(undefined)

    useEffect(() => {
        if (numSelectedUsers === 0) {
            setChannelPreview(undefined)
        } else if (numSelectedUsers === 1 && matchingDM) {
            setChannelPreview(matchingDM)
        }
    }, [matchingDM, numSelectedUsers, onSelectChannel])

    const onConfirm = useCallback(() => {
        if (channelPreview) {
            onSelectChannel(channelPreview.id)
        } else {
            onSubmit()
        }
    }, [channelPreview, onSelectChannel, onSubmit])

    const preview =
        channelPreview?.id || (numSelectedUsers === 0 ? userChannelPreview?.id : undefined)

    const channelContainerRef = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        // capture click on channel preview to select channel on desktop
        const onClickScreen = (e: MouseEvent) => {
            if (channelContainerRef.current?.contains(e.target as Node)) {
                onConfirm()
            }
        }
        window.addEventListener('click', onClickScreen)
        return () => {
            window.removeEventListener('click', onClickScreen)
        }
    }, [onConfirm, onSelectChannel, preview])

    const animationKey = [channelPreview?.id].join()

    return (
        <Stack grow position="relative">
            {!isTouch && numSelectedUsers && (
                <Box grow ref={channelContainerRef}>
                    <AnimatePresence mode="sync">
                        <MotionBox
                            grow
                            position="relative"
                            key={animationKey}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0 } }}
                            transition={{ duration: 0.3, delay: 0, ease: 'easeInOut' }}
                        >
                            {preview ? (
                                <DMChannelContextUserLookupProvider
                                    fallbackToParentContext
                                    channelId={preview}
                                >
                                    <ChannelContextProvider channelId={preview}>
                                        <SpacesChannelComponent hideHeader preventAutoFocus />
                                    </ChannelContextProvider>
                                </DMChannelContextUserLookupProvider>
                            ) : (
                                <ChannelPlaceholder
                                    userIds={
                                        selectedUserArray?.length
                                            ? selectedUserArray
                                            : userPreview
                                            ? [userPreview]
                                            : []
                                    }
                                />
                            )}

                            {isTouch && (
                                <Box
                                    absoluteFill
                                    cursor="pointer"
                                    background="level1"
                                    style={{ opacity: 0 }}
                                    onClick={() => onSelectChannel(preview)}
                                />
                            )}
                        </MotionBox>
                    </AnimatePresence>
                </Box>
            )}

            <ZLayerBox>
                <UserPillSelector
                    emptySelectionElement={emptySelectionElement}
                    onSelectionChange={onSelectionChange}
                    onConfirm={onConfirm}
                    onUserPreviewChange={onUserPreviewChange}
                />
            </ZLayerBox>
            <AnimatePresence>
                {isSubmitting && (
                    <FadeInBox absoluteFill cursor="progress">
                        <Box
                            centerContent
                            width="100%"
                            height="100%"
                            pointerEvents="none"
                            background="level1"
                            style={{ opacity: 0.5 }}
                        />
                    </FadeInBox>
                )}
            </AnimatePresence>
        </Stack>
    )
}
