import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    ChannelContextProvider,
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { DraftChannel } from '@components/Channel/Channel'
import { PanelContext } from '@components/Panel/PanelContext'
import { UserList } from '@components/UserList/UserList'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { NoMatches } from '@components/NoMatches/NoMatches'
import { Box, Button, Icon, MotionBox, Paragraph, Stack, Text } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { MotionBoxProps } from 'ui/components/Motion/MotionComponents'
import { getDraftDMStorageId } from 'utils'
import { MessageDropDown } from './MessageDropDown'
import { UserOrDMOption, UserPillSelector } from './UserPillSelector'
import { useMatchingMessages } from './hooks/useMatchingMessages'

export const CreateMessageSelect = () => {
    const { isTouch } = useDevice()
    const { createLink } = useCreateLink()
    const { lookupUser } = useUserLookupContext()
    const { dmChannels } = useTownsContext()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const userIdsFromParams = searchParams.get('to')?.split(',')
    const [selectedUsers, setSelectedIds] = useState(() => new Set<string>(userIdsFromParams))
    const selectedUserArray = useMemo(() => Array.from(selectedUsers), [selectedUsers])
    const numSelectedUsers = selectedUserArray.length

    useEscapeCreateMessage()

    const { inclusiveMatches, matchingDM, matchingGDM } = useMatchingMessages({
        selectedUserArray,
        dmChannels,
    })

    const onSelectionChange = useCallback((userIds: Set<string>) => {
        setSelectedIds(userIds)
    }, [])

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
    const [existingStreamId, setExistingStreamId] = useState<string | undefined>()

    const onCreateDraft = useEvent(() => {
        const tracked = {
            numberOfSelectedUsers: numSelectedUsers,
            totalParticipants: numSelectedUsers + 1,
            dmType: numSelectedUsers === 1 ? 'direct' : numSelectedUsers > 1 ? 'group' : 'invalid',
        }
        Analytics.getInstance().track('confirmed create direct message', tracked, () => {
            console.log('[analytics] confirmed create direct message', tracked)
        })

        setSearchParams({ ...searchParams, to: selectedUserArray.join() })
    })

    const firstUser = useMemo(
        () => lookupUser(selectedUsers.values().next().value),
        [lookupUser, selectedUsers],
    )

    const createCTA = useMemo(
        () =>
            !numSelectedUsers ? undefined : numSelectedUsers === 1 && firstUser ? (
                matchingDM ? undefined : (
                    <Stack horizontal grow gap="sm" alignItems="center">
                        <UserOrDMOption data={firstUser} selected={false} />
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
                            <UserList excludeSelf userIds={Array.from(selectedUsers)} />
                        </Text>
                    </Paragraph>
                </Stack>
            ),
        [firstUser, isTouch, matchingDM, matchingGDM.length, numSelectedUsers, selectedUsers],
    )

    useEffect(() => {
        if (numSelectedUsers === 0) {
            setExistingStreamId(undefined)
        } else if (numSelectedUsers === 1 && matchingDM) {
            setExistingStreamId(matchingDM.id)
        }
    }, [matchingDM, numSelectedUsers, onSelectChannel])

    const onSelectCurrentChoice = useCallback(() => {
        if (existingStreamId) {
            onSelectChannel(existingStreamId)
        } else {
            onCreateDraft()
        }
    }, [existingStreamId, onCreateDraft, onSelectChannel])

    const { captureClickRef } = useCaptureContainerClick(onSelectCurrentChoice)

    const storageId = getDraftDMStorageId(selectedUserArray)

    const emptySelectionElement = useCallback(
        ({ searchTerm }: { searchTerm: string }) => {
            return searchTerm?.length && !inclusiveMatches?.length ? (
                <NoMatches searchTerm={searchTerm} />
            ) : numSelectedUsers > 1 ? (
                <MessageDropDown
                    createNewCTA={createCTA}
                    channels={inclusiveMatches}
                    onCreateNew={onCreateDraft}
                    onSelectChannel={onSelectChannel}
                    onFocusChange={(channel: DMChannelIdentifier | undefined) => {
                        console.log('create dm: onFocusChange', channel?.id)
                        setExistingStreamId(channel?.id)
                    }}
                />
            ) : (
                <></>
            )
        },
        [inclusiveMatches, numSelectedUsers, createCTA, onCreateDraft, onSelectChannel],
    )

    return (
        <MessageContainerLayout
            preventAutoFocus
            hideContent={isTouch}
            ref={captureClickRef}
            storageId={storageId}
            streamId={existingStreamId}
            userIds={selectedUserArray}
        >
            <ZLayerBox>
                <UserPillSelector
                    emptySelectionElement={emptySelectionElement}
                    onSelectionChange={onSelectionChange}
                    onConfirm={onSelectCurrentChoice}
                    onSelectChannel={onSelectChannel}
                />
            </ZLayerBox>
        </MessageContainerLayout>
    )
}

export const MessageContainerLayout = React.forwardRef<
    HTMLDivElement,
    {
        children?: React.ReactNode
        userIds?: string[]
        storageId?: string
        streamId?: string
        hideContent?: boolean
        preventAutoFocus?: boolean
        hideHeader?: boolean
    }
>((props, ref) => (
    <Stack grow position="relative">
        {!props.hideContent && !!props.userIds?.length && (
            <Box grow ref={ref}>
                <AnimatePresence mode="sync">
                    <FadeBox grow position="relative" key={props.storageId}>
                        <DMChannelContextUserLookupProvider channelId={props.streamId ?? ''}>
                            <ChannelContextProvider channelId={props.streamId ?? ''}>
                                <DraftChannel
                                    preventAutoFocus={props.preventAutoFocus}
                                    userIds={props.userIds}
                                    storageId={props.storageId}
                                    hideHeader={props.hideHeader}
                                />
                            </ChannelContextProvider>
                        </DMChannelContextUserLookupProvider>
                    </FadeBox>
                </AnimatePresence>
            </Box>
        )}
        {props.children}
    </Stack>
))

const FadeBox = (props: MotionBoxProps) => (
    <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0 } }}
        transition={{ duration: 0.3, delay: 0, ease: 'easeInOut' }}
        {...props}
    />
)

const useCaptureContainerClick = (onClick: () => void) => {
    const captureClickRef = React.useRef<HTMLDivElement>(null)
    useEffect(() => {
        // capture click on channel preview to select channel on desktop
        const onCaptureClick = (e: MouseEvent) => {
            if (captureClickRef.current?.contains(e.target as Node)) {
                onClick()
            }
        }
        window.addEventListener('click', onCaptureClick)
        return () => {
            window.removeEventListener('click', onCaptureClick)
        }
    }, [captureClickRef, onClick])
    return { captureClickRef }
}

const useEscapeCreateMessage = () => {
    const navigate = useNavigate()
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                Analytics.getInstance().track('canceled create direct message')
                navigate(-1)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [navigate])
}
