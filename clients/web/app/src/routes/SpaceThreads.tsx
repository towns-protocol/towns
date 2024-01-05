import React, { useCallback, useMemo } from 'react'
import { firstBy } from 'thenby'
import {
    ChannelContextProvider,
    ThreadResult,
    useMyProfile,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-zion-client'
import { useNavigate } from 'react-router'
import { MessageThread } from '@components/MessageThread/MessageThread'
import { Box, Divider, Heading, Icon, IconButton, Paragraph, Stack } from '@ui'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { useDevice } from 'hooks/useDevice'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { useCreateLink } from 'hooks/useCreateLink'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

function sortThreads(threads: ThreadResult[]) {
    return threads.sort(
        firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
    )
}

export const SpaceThreads = () => {
    const userId = useMyProfile()?.userId
    const spaceId = useSpaceId()
    const threadRoots = useSpaceThreadRoots()
    const { isTouch } = useDevice()

    const filteredThreadRoots = useMemo(() => {
        return threadRoots.filter((t) => {
            return t.thread.isParticipating && !!t.thread.parentEvent
        })
    }, [threadRoots])

    const threads = usePersistOrder(filteredThreadRoots, {
        sorterFn: sortThreads,
        identityFn: (t: ThreadResult) => t.thread.parentId,
    })

    const navigate = useNavigate()

    const { createLink } = useCreateLink()
    const onTouchClose = useCallback(() => {
        const link = createLink({ route: 'townHome' })
        if (link) {
            navigate(link)
        }
    }, [createLink, navigate])

    return (
        <CentralPanelLayout>
            {isTouch && (
                <TouchNavBar
                    contentLeft={
                        <IconButton
                            icon="back"
                            size="square_md"
                            color="default"
                            onClick={onTouchClose}
                        />
                    }
                >
                    Threads
                </TouchNavBar>
            )}
            {userId && spaceId && threads.length > 0 ? (
                <Stack
                    scroll
                    grow
                    id={TouchScrollToTopScrollId.ThreadsTabScrollId}
                    position="relative"
                >
                    <Stack
                        gap="lg"
                        paddingX={isTouch ? 'none' : 'lg'}
                        paddingY="lg"
                        minHeight={{ touch: 'forceScroll', default: 'auto' }}
                    >
                        {threads.map(({ thread, channel }, index) => {
                            return (
                                <ChannelContextProvider
                                    key={thread.parentId}
                                    channelId={channel.id}
                                >
                                    <MediaDropContextProvider
                                        disableDrop
                                        title=""
                                        channelId={channel.id}
                                    >
                                        <>
                                            <MessageThread
                                                userId={userId}
                                                parentId={thread.parentId}
                                                channelId={channel.id}
                                                channelLabel={channel.label}
                                                spaceId={spaceId}
                                            />
                                            {isTouch && index < threads.length - 1 && <Divider />}
                                        </>
                                    </MediaDropContextProvider>
                                </ChannelContextProvider>
                            )
                        })}
                    </Stack>
                </Stack>
            ) : (
                <Stack centerContent grow scroll absoluteFill>
                    <Stack centerContent gap="lg" minHeight="100svh" padding="lg">
                        <NoContent />
                    </Stack>
                </Stack>
            )}
        </CentralPanelLayout>
    )
}

const NoContent = () => {
    const { loadingChannels, hasJoinedChannels } = useHasJoinedChannels()

    if (loadingChannels) {
        return (
            <>
                <ButtonSpinner /> Loading...
            </>
        )
    }
    if (hasJoinedChannels) {
        return (
            <>
                <Box padding="md" color="gray2" background="level2" rounded="sm">
                    <Icon type="threads" size="square_sm" />
                </Box>
                <Heading level={3}>No threads yet</Heading>
                <Paragraph textAlign="center" color="gray2">
                    Threads help you keep track of conversations you engage with.
                </Paragraph>
            </>
        )
    }

    return <NoJoinedChannelsFallback />
}
