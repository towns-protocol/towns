import React from 'react'
import { firstBy } from 'thenby'
import {
    ChannelContextProvider,
    ThreadResult,
    useMatrixCredentials,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-zion-client'
import { MessageThread } from '@components/MessageThread/MessageThread'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { TouchLayoutNavigationBar } from '@components/TouchLayoutNavigationBar/TouchLayoutNavigationBar'
import { useDevice } from 'hooks/useDevice'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

function sortThreads(threads: ThreadResult[]) {
    return threads.sort(
        firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
    )
}

export const SpaceThreads = () => {
    const { userId } = useMatrixCredentials()
    const spaceId = useSpaceId()
    const threadRoots = useSpaceThreadRoots()
    const { isMobile } = useDevice()

    const threads = usePersistOrder(threadRoots, {
        sorterFn: sortThreads,
        identityFn: (t: ThreadResult) => t.thread.parentId,
    }).filter((t) => t.thread.parentEvent)

    return (
        <CentralPanelLayout>
            {isMobile && <TouchLayoutNavigationBar value="threads" />}
            {userId && spaceId && threads.length > 0 ? (
                <Stack absoluteFill scroll paddingTop={isMobile ? 'x8' : 'none'}>
                    <Stack gap="lg" padding="lg" minHeight="100svh">
                        {threads.map(({ thread, channel }) => {
                            return (
                                <ChannelContextProvider
                                    key={thread.parentId}
                                    channelId={channel.id}
                                >
                                    <MessageThread
                                        userId={userId}
                                        parentId={thread.parentId}
                                        channelId={channel.id}
                                        channelLabel={channel.label}
                                        spaceId={spaceId}
                                    />
                                </ChannelContextProvider>
                            )
                        })}
                    </Stack>
                </Stack>
            ) : (
                <Stack centerContent grow scroll absoluteFill>
                    <Stack centerContent gap="lg" width="250" minHeight="100svh">
                        <Box padding="md" color="gray2" background="level2" rounded="sm">
                            <Icon type="threads" size="square_sm" />
                        </Box>
                        <Heading level={3}>No threads yet</Heading>
                        <Paragraph textAlign="center" color="gray2">
                            Threads help you keep track of conversations you engage with.
                        </Paragraph>
                    </Stack>
                </Stack>
            )}
        </CentralPanelLayout>
    )
}
