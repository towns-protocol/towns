/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { registerAndStartClients } from './helpers/TestUtils'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { RoomVisibility } from '../../src/types/matrix-types'
import { act } from 'react-dom/test-utils'
import { ZionTestApp } from './helpers/ZionTestApp'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { RegisterAndJoin } from './helpers/TestComponents'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useChannelThreadStats } from '../../src/hooks/use-channel-thread-stats'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { ThreadStats, TimelineEvent } from '../../src/types/timeline-types'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendThreadedMessageHooks', () => {
    jest.setTimeout(60000)
    test('user can join a room, see messages, and send threaded messages', async () => {
        // covers sending reactions, replies, etc
        // - jane creates a public space and two channels
        // - bob joins the space and both channels
        // - jane sends a message in each channel
        // - bob renders channel_1
        // - bob sends a message in each channel
        // - jane replies to janes's message in channel_1 creating channel_1.thread
        // - jane replies to bobs's message in channel_2 creating channel_2.thread
        // - bob sees thread stats on chanel_1.message_1

        // todo...
        // - bob renders the thread list
        // -- bob should see the channel_2.thread in his thread list
        // -- bob should see unread markers in channels and threads
        // -- unread markers should all be isFollowing=true execept for channel_1.thread
        // - bob marks the thread markers as read one by one

        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // create a space
        const spaceId = await jane.createSpace({
            name: 'janes space',
            visibility: RoomVisibility.Public,
        })
        // create channels
        const channel_1 = await jane.createChannel({
            name: 'janes channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
        })
        const channel_2 = await jane.createChannel({
            name: 'janes channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
        })

        // render bob's app
        act(() => {
            const TestChannelComponent = () => {
                const { sendMessage } = useZionClient()
                const channelTimeline = useChannelTimeline()
                const threadStats = useChannelThreadStats()

                const sendInitialMessages = useCallback(() => {
                    const foo = async () => {
                        await sendMessage(channel_1, 'hello jane in channel_1')
                        await sendMessage(channel_2, 'hello jane in channel_2')
                    }
                    void foo()
                }, [sendMessage])

                const formatMessage = useCallback(
                    (e: TimelineEvent) => {
                        const replyCount = threadStats[e.eventId]?.replyCount
                        const replyCountStr = replyCount ? `(replyCount:${replyCount})` : ''
                        return `${e.fallbackContent} ${replyCountStr}`
                    },
                    [threadStats],
                )
                const formatThreadStats = (k: string, v: ThreadStats) => {
                    return `${k} (replyCount:${v.replyCount} userIds:${[...v.userIds].join(',')})`
                }

                return (
                    <>
                        <RegisterAndJoin roomIds={[spaceId, channel_1, channel_2]} />
                        <button onClick={sendInitialMessages}>sendInitialMessages</button>
                        <div data-testid="channelMessages">
                            {channelTimeline.map((event) => formatMessage(event)).join('\n')}
                        </div>
                        <div data-testid="threadStats">
                            {Object.entries(threadStats)
                                .map((kv) => formatThreadStats(kv[0], kv[1]))
                                .join('\n')}
                        </div>
                    </>
                )
            }
            render(
                <ZionTestApp provider={bobProvider}>
                    <SpaceContextProvider spaceId={spaceId}>
                        <ChannelContextProvider channelId={channel_1}>
                            <TestChannelComponent />
                        </ChannelContextProvider>
                    </SpaceContextProvider>
                </ZionTestApp>,
            )
        })
        const clientRunning = screen.getByTestId('clientRunning')
        const joinComplete = screen.getByTestId('joinComplete')
        const channelMessages = screen.getByTestId('channelMessages')
        const sendInitialMessages = screen.getByRole('button', {
            name: 'sendInitialMessages',
        })

        // - bob joins the space and both channels
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        await waitFor(() => expect(joinComplete).toHaveTextContent('true'))
        // - bob renders channel_1
        await waitFor(() => expect(channelMessages).toHaveTextContent('m.room.create'))
        // - jane sends messages
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello channel_1')
            await jane.sendMessage(channel_2, 'hello channel_2')
        })
        const channel_1_message_0 = jane
            .getRoom(channel_1)!
            .getLiveTimeline()
            .getEvents()
            .find((e) => e.getContent()?.body === 'hello channel_1')!
        await waitFor(() => expect(channel_1_message_0.getId().startsWith('~')).toBe(false))

        // - bob renders channel_1
        await waitFor(() => expect(channelMessages).toHaveTextContent('hello channel_1'))
        // - bob sends a message in each channel
        fireEvent.click(sendInitialMessages)

        // - jane replies to janes's message in channel_1 creating channel_1.thread
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello thread in channel_1', {
                threadId: channel_1_message_0.getId(),
            })
        })
        // - bob sees thread stats on chanel_1.message_1
        await waitFor(() =>
            expect(channelMessages).toHaveTextContent('hello channel_1 (replyCount:1)'),
        )
        // - jane replies to bobs's message in channel_2 creating channel_2.thread
        await waitFor(() =>
            expect(
                jane
                    .getRoom(channel_2)!
                    .getLiveTimeline()
                    .getEvents()
                    .find((e) => e.getContent()?.body === 'hello jane in channel_2'),
            ).toBeDefined(),
        )
        const channel_2_message_1 = jane
            .getRoom(channel_2)!
            .getLiveTimeline()
            .getEvents()
            .find((e) => e.getContent()?.body === 'hello jane in channel_2')!

        await act(async () => {
            await jane.sendMessage(channel_2, 'hello thread in channel_2', {
                threadId: channel_2_message_1.getId(),
            })
        })
        // todo...
    })
})
