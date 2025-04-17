import React, { useMemo } from 'react'
import { firstBy } from 'thenby'
import {
    ChannelContextProvider,
    useMyProfile,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-towns-client'
import { ThreadResult } from '@towns-protocol/sdk'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { MessageThreadCard } from '@components/MessageThread/MessageThreadCard'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Box, Divider, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { useSpaceChannels } from 'hooks/useSpaceChannels'

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
    const spaceChannels = useSpaceChannels()

    const filteredThreadRoots = useMemo(() => {
        return threadRoots.filter((t) => {
            return t.thread.isParticipating
        })
    }, [threadRoots])

    const threads = usePersistOrder(filteredThreadRoots, {
        sorterFn: sortThreads,
        identityFn: (t: ThreadResult) => t.thread.parentId,
    })

    return (
        <>
            {userId && spaceId && threads.length > 0 ? (
                <Stack
                    scroll
                    grow
                    id={TouchScrollToTopScrollId.ThreadsTabScrollId}
                    position="relative"
                >
                    <Stack
                        paddingY
                        gap="lg"
                        paddingX={isTouch ? 'none' : 'md'}
                        minHeight={{ touch: 'forceScroll', default: 'auto' }}
                    >
                        {threads.map(({ thread, channel }, index) => {
                            return (
                                <ChannelContextProvider
                                    key={thread.parentId}
                                    channelId={channel.id}
                                >
                                    <>
                                        <MessageThreadCard
                                            userId={userId}
                                            parentId={thread.parentId}
                                            channelId={channel.id}
                                            channelLabel={channel.label}
                                            spaceId={spaceId}
                                            spaceChannels={spaceChannels}
                                        />
                                        {isTouch && index < threads.length - 1 && <Divider />}
                                    </>
                                </ChannelContextProvider>
                            )
                        })}
                    </Stack>
                </Stack>
            ) : (
                <Stack centerContent grow>
                    <Stack centerContent gap="lg" padding="x8">
                        <NoContent />
                    </Stack>
                </Stack>
            )}
        </>
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
