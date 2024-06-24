import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import {
    ChannelContextProvider,
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    LookupUser,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { UserList } from '@components/UserList/UserList'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { Box, Button, Icon, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { PanelContext, PanelStack } from '@components/Panel/PanelContext'
import { useAnalytics } from 'hooks/useAnalytics'
import { Channel, DraftChannel } from '@components/Channel/Channel'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { MessageDropDown } from './MessageDropDown'
import { UserOption, UserPillSelector } from './UserPillSelector'
import { useCreateDirectMessage } from './hooks/useCreateDirectMessage'
import { useMatchingMessages } from './hooks/useMatchingMessages'

type Props = {
    onDirectMessageCreated?: () => void
}

export const CreateMessagePanel = () => {
    const { isTouch } = useDevice()
    const [search] = useSearchParams()
    const stackId =
        search.get('stackId') === PanelStack.DIRECT_MESSAGES
            ? PanelStack.DIRECT_MESSAGES
            : PanelStack.MAIN
    return isTouch ? (
        <>
            <Panel label="New Message" padding="none" stackId={stackId}>
                <CreateDirectMessage />
            </Panel>
            <Outlet />
        </>
    ) : (
        <CreateDirectMessage />
    )
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props

    const { isTouch } = useDevice()

    const { analytics } = useAnalytics()
    const navigate = useNavigate()
    const { createLink } = useCreateLink()
    const { lookupUser } = useUserLookupContext()

    const { dmChannels } = useTownsContext()

    const [selectedUsers, setSelectedIds] = useState(() => new Set<string>())
    const selectedUserArray = useMemo(() => Array.from(selectedUsers), [selectedUsers])
    const numSelectedUsers = selectedUserArray.length

    const [searchParams] = useSearchParams()
    const noStreamUserId = searchParams.get('to')

    const isDraft = !!noStreamUserId

    const { inclusiveMatches, matchingDM, matchingGDM } = useMatchingMessages({
        selectedUserArray,
        dmChannels,
    })

    const { onSubmit, isSubmitting } = useCreateDirectMessage({
        selectedIdsArray: selectedUserArray,
        matchingChannel: inclusiveMatches.length === 1 ? inclusiveMatches[0] : undefined,
        fromDraft: true,
        onDirectMessageCreated,
    })

    const onSelectionChange = useCallback((userIds: Set<string>) => {
        setSelectedIds(userIds)
    }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                analytics?.track(
                    'escape key pressed',
                    {
                        panel: PanelStack.DIRECT_MESSAGES,
                    },
                    () => {
                        console.log('[analytics] escape key pressed', {
                            panel: PanelStack.DIRECT_MESSAGES,
                        })
                    },
                )
                navigate(-1)
            }
        }

        if (isDraft) {
            setSelectedIds(new Set<string>([noStreamUserId]))
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [analytics, navigate, isDraft, noStreamUserId, setSelectedIds])

    const stackId = useContext(PanelContext)?.stackId

    const onSelectChannel = useCallback(
        (channelId?: string) => {
            if (!channelId) {
                return
            }

            const link = createLink({ messageId: channelId })
            if (link) {
                navigate(`${link}${stackId?.length ? `?stackId=${stackId}` : ''}`)
            }
        },
        [createLink, navigate, stackId],
    )

    // preview a channel when selecting from message dropdown
    const [userChannelPreview, setUserChannelPreview] = useState<DMChannelIdentifier | undefined>()

    const onUserPreviewChange = (user: LookupUser | undefined) => {
        if (user) {
            const matchingChannel = user?.userId
                ? dmChannels.find((dm) => !dm.isGroup && dm.userIds.includes(user?.userId))
                : undefined

            setUserChannelPreview(matchingChannel)
        }
    }
    const firstUser = useMemo(
        () => lookupUser(selectedUsers.values().next().value),
        [lookupUser, selectedUsers],
    )

    const createCTA = useMemo(
        () =>
            !numSelectedUsers ? undefined : numSelectedUsers === 1 && firstUser ? (
                matchingDM ? undefined : (
                    <Stack horizontal grow gap="sm" alignItems="center">
                        <UserOption user={firstUser} selected={false} />
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
        [firstUser, isTouch, matchingDM, matchingGDM.length, numSelectedUsers, selectedUsers],
    )

    const onCreateNew = useCallback(() => {
        const tracked = {
            numberOfSelectedUsers: numSelectedUsers,
            totalParticipants: numSelectedUsers + 1,
            dmType: numSelectedUsers === 1 ? 'direct' : numSelectedUsers > 1 ? 'group' : 'invalid',
        }
        console.log('[analytics] confirmed create direct message', tracked)
        onSubmit()
    }, [numSelectedUsers, onSubmit])

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
                    onCreateNew={onCreateNew}
                    onSelectChannel={onSelectChannel}
                    onFocusChange={(channel: DMChannelIdentifier) => setChannelPreview(channel)}
                />
            ) : (
                <></>
            )
        },
        [inclusiveMatches, numSelectedUsers, createCTA, onCreateNew, onSelectChannel],
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
            const tracked = {
                numberOfSelectedUsers: numSelectedUsers,
                totalParticipants: numSelectedUsers + 1,
                dmType:
                    numSelectedUsers === 1 ? 'direct' : numSelectedUsers > 1 ? 'group' : 'invalid',
            }
            analytics?.track('confirmed create direct message', tracked, () => {
                console.log('[analytics] confirmed create direct message', tracked)
            })
            onSubmit()
        }
    }, [analytics, channelPreview, numSelectedUsers, onSelectChannel, onSubmit])

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

        if (isDraft) {
            onConfirm()
        } else {
            window.addEventListener('click', onClickScreen)
        }
        return () => {
            window.removeEventListener('click', onClickScreen)
        }
    }, [onConfirm, onSelectChannel, isDraft, preview])

    const animationKey = [channelPreview?.id].join()

    return (
        <Stack grow position="relative">
            {!isTouch ? (
                (numSelectedUsers || isDraft) && (
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
                                <DMChannelContextUserLookupProvider channelId={preview ?? ''}>
                                    <ChannelContextProvider channelId={preview ?? ''}>
                                        {preview ? (
                                            <Channel hideHeader preventAutoFocus />
                                        ) : (
                                            <DraftChannel
                                                userIds={selectedUserArray}
                                                preventAutoFocus={!isDraft && !isSubmitting}
                                            />
                                        )}
                                    </ChannelContextProvider>
                                </DMChannelContextUserLookupProvider>

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
                )
            ) : isSubmitting ? (
                // temporary spinner for touch - will go away next PR
                <Box centerContent absoluteFill>
                    <ButtonSpinner />
                </Box>
            ) : (
                <></>
            )}

            {!isDraft && !isSubmitting && (
                <ZLayerBox>
                    <UserPillSelector
                        emptySelectionElement={emptySelectionElement}
                        disabled={isSubmitting}
                        onSelectionChange={onSelectionChange}
                        onConfirm={onConfirm}
                        onUserPreviewChange={onUserPreviewChange}
                    />
                </ZLayerBox>
            )}
        </Stack>
    )
}
