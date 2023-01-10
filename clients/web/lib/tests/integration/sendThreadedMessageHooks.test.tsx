/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import {
    FullyReadMarker,
    ThreadResult,
    ThreadStats,
    TimelineEvent,
} from '../../src/types/timeline-types'
import React, { useCallback } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterAndJoin } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/matrix-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelThreadStats } from '../../src/hooks/use-channel-thread-stats'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { useSpaceNotificationCounts } from '../../src/hooks/use-space-notification-counts'
import { useSpaceThreadRoots } from '../../src/hooks/use-space-thread-roots'
import { useTimelineThread } from '../../src/hooks/use-timeline-thread'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendThreadedMessageHooks', () => {
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
        // - bob renders the thread list
        // -- bob should see the channel_2.thread in his thread list

        // todo...
        // -- bob should see unread markers in channels and threads
        // - bob marks the thread markers as read one by one

        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // jane needs funds to create a spaceß
        await jane.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // create channels
        const channel_1 = (await createTestChannelWithSpaceRoles(jane, {
            name: 'channel_1',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier
        const channel_2 = (await createTestChannelWithSpaceRoles(jane, {
            name: 'channel_2',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier

        // render bob's app
        const TestChannelComponent = () => {
            const { sendMessage, editMessage, sendReadReceipt } = useZionClient()
            const threadRoots = useSpaceThreadRoots()
            const channelTimeline = useChannelTimeline()
            const channelThreadStats = useChannelThreadStats()
            const spaceNotifications = useSpaceNotificationCounts(spaceId)
            const channel_1_fullyRead = useFullyReadMarker(channel_1)
            const channel_2_fullyRead = useFullyReadMarker(channel_2)

            const channel_2_threadRoot = Object.values(threadRoots).at(0)
            const channel_2_thread = useTimelineThread(
                channel_2,
                channel_2_threadRoot?.thread.parentId,
            )
            const channel_2_thread_fullyRead = useFullyReadMarker(
                channel_2,
                channel_2_threadRoot?.thread.parentId,
            )

            const sendInitialMessages = useCallback(() => {
                void sendMessage(channel_1, 'hello jane in channel_1')
                void sendMessage(channel_2, 'hello jane in channel_2')
            }, [sendMessage])

            const editChannel2Message1 = useCallback(() => {
                if (!channel_2_threadRoot) {
                    throw new Error('no channel_2_threadRoot')
                }
                const channelId = channel_2_threadRoot.channel.id
                const messageId = channel_2_threadRoot.thread.parentId
                void editMessage(
                    channelId,
                    'hello jane old friend in channel_2',
                    {
                        originalEventId: messageId,
                    },
                    undefined,
                )
            }, [editMessage, channel_2_threadRoot])

            const markAllAsRead = useCallback(() => {
                void sendReadReceipt(channel_1_fullyRead!)
                void sendReadReceipt(channel_2_fullyRead!)
                void sendReadReceipt(channel_2_thread_fullyRead!)
            }, [
                channel_1_fullyRead,
                channel_2_fullyRead,
                channel_2_thread_fullyRead,
                sendReadReceipt,
            ])

            const formatThreadParent = (t: ThreadStats) => {
                return `replyCount: (${t.replyCount}) parentId: (${t.parentId}) message: (${
                    t.parentMessageContent?.body ?? ''
                })`
            }

            const formatThreadRoot = (t: ThreadResult) => {
                const mentions = t.fullyReadMarker?.mentions ?? 0
                return (
                    `channel: (${
                        t.channel.label
                    }) isUnread: (${t.isUnread.toString()}) mentions: (${mentions}) ` +
                    formatThreadParent(t.thread)
                )
            }

            const formatMessage = useCallback(
                (e: TimelineEvent) => {
                    const replyCount = channelThreadStats[e.eventId]?.replyCount
                    const replyCountStr = replyCount ? `(replyCount:${replyCount})` : ''
                    return `${e.fallbackContent} ${replyCountStr}`
                },
                [channelThreadStats],
            )
            const formatThreadStats = (k: string, v: ThreadStats) => {
                return `${k} (replyCount:${v.replyCount} userIds:${[...v.userIds].join(',')})`
            }

            const formatFullyReadMarker = (m?: FullyReadMarker) => {
                return m === undefined
                    ? 'undefined'
                    : `isUnread:${m.isUnread.toString()} eventId:${
                          m.eventId
                      } mentions:${m.mentions.toString()}`
            }

            return (
                <>
                    <RegisterAndJoin roomIds={[spaceId, channel_1, channel_2]} />
                    <button onClick={sendInitialMessages}>sendInitialMessages</button>
                    <button onClick={editChannel2Message1}>editChannel2Message1</button>
                    <button onClick={markAllAsRead}>markAllAsRead</button>
                    <div data-testid="spaceNotifications">
                        {`isUnread:${spaceNotifications.isUnread.toString()} mentions:${
                            spaceNotifications.mentions
                        }`}
                    </div>
                    <div data-testid="channel_1_fullyRead">
                        {formatFullyReadMarker(channel_1_fullyRead)}
                    </div>
                    <div data-testid="channel_2_fullyRead">
                        {formatFullyReadMarker(channel_2_fullyRead)}
                    </div>
                    <div data-testid="channel_2_thread_fullyRead">
                        {formatFullyReadMarker(channel_2_thread_fullyRead)}
                    </div>
                    <div data-testid="threadRoots">
                        {threadRoots.map((t) => formatThreadRoot(t)).join('\n')}
                    </div>
                    <div data-testid="channel2ThreadParent">
                        {channel_2_thread?.parent
                            ? formatThreadParent(channel_2_thread.parent)
                            : 'undefined'}
                    </div>
                    <div data-testid="channel2ThreadMessages">
                        {channel_2_thread?.messages?.map((e) => formatMessage(e)).join('\n') ?? ''}
                    </div>
                    <div data-testid="channelMessages">
                        {channelTimeline.map((event) => formatMessage(event)).join('\n')}
                    </div>
                    <div data-testid="channelThreadStats">
                        {Object.entries(channelThreadStats)
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

        const bobUserId = screen.getByTestId('userId')
        const clientRunning = screen.getByTestId('clientRunning')
        const joinComplete = screen.getByTestId('joinComplete')
        const channelMessages = screen.getByTestId('channelMessages')
        const channel2ThreadParent = screen.getByTestId('channel2ThreadParent')
        const channel2ThreadMessages = screen.getByTestId('channel2ThreadMessages')
        const spaceNotifications = screen.getByTestId('spaceNotifications')
        const channel_1_fullyRead = screen.getByTestId('channel_1_fullyRead')
        const channel_2_fullyRead = screen.getByTestId('channel_2_fullyRead')
        const channel_2_thread_fullyRead = screen.getByTestId('channel_2_thread_fullyRead')
        const threadRoots = screen.getByTestId('threadRoots')
        const sendInitialMessages = screen.getByRole('button', {
            name: 'sendInitialMessages',
        })
        const editChannel2Message1 = screen.getByRole('button', {
            name: 'editChannel2Message1',
        })
        const markAllAsRead = screen.getByRole('button', { name: 'markAllAsRead' })

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
        await waitFor(
            () => expect(channel_1_message_0.getId().startsWith('~')).toBe(false),
            TestConstants.DefaultWaitForTimeout,
        )

        // - bob renders channel_1
        await waitFor(
            () => expect(channelMessages).toHaveTextContent('hello channel_1'),
            TestConstants.DefaultWaitForTimeout,
        )
        // - bob sends a message in each channel
        fireEvent.click(sendInitialMessages)

        // - jane replies to janes's message in channel_1 creating channel_1.thread
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello thread in channel_1', {
                threadId: channel_1_message_0.getId(),
            })
        })
        // - bob sees thread stats on chanel_1.message_1
        await waitFor(
            () => expect(channelMessages).toHaveTextContent('hello channel_1 (replyCount:1)'),
            TestConstants.DefaultWaitForTimeout,
        )
        // - jane messages again
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello again in channel_1', {
                threadId: channel_1_message_0.getId(),
            })
        })
        // - bob sees thread stats on chanel_1.message_1
        await waitFor(
            () => expect(channelMessages).toHaveTextContent('hello channel_1 (replyCount:2)'),
            TestConstants.DefaultWaitForTimeout,
        )
        // - jane replies to bobs's message in channel_2 creating channel_2.thread
        await waitFor(
            () =>
                expect(
                    jane
                        .getRoom(channel_2)!
                        .getLiveTimeline()
                        .getEvents()
                        .find((e) => e.getContent()?.body === 'hello jane in channel_2'),
                ).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
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
        // -- bob should see the channel_2.thread in his thread list
        await waitFor(
            () =>
                expect(threadRoots).toHaveTextContent(
                    `channel: (channel_2) isUnread: (true) mentions: (0) replyCount: (1) parentId: (${channel_2_message_1.getId()})`,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
        // -- bob should not see the channel_1.thread in his thread list
        await waitFor(
            () => expect(threadRoots).not.toHaveTextContent(`channel: (channel_1)`),
            TestConstants.DefaultWaitForTimeout,
        )
        // -- bob should see the thread root message in is thread list
        await waitFor(
            () => expect(threadRoots).toHaveTextContent(`hello jane in channel_2`),
            TestConstants.DefaultWaitForTimeout,
        )
        // -- bob edits is message in channel_2
        fireEvent.click(editChannel2Message1)
        // -- bob sees thread root updated
        await waitFor(
            () => expect(threadRoots).toHaveTextContent(`hello jane old friend in channel_2`),
            TestConstants.DefaultWaitForTimeout,
        )
        // -- and the thread parent (different hook)
        await waitFor(
            () =>
                expect(channel2ThreadParent).toHaveTextContent(
                    'hello jane old friend in channel_2',
                ),
            TestConstants.DefaultWaitForTimeout,
        )
        // -- and the thread messages
        await waitFor(
            () => expect(channel2ThreadMessages).toHaveTextContent('hello thread in channel_2'),
            TestConstants.DefaultWaitForTimeout,
        )
        // todo...
        // -- bob should see unread markers in channels and threads
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('isUnread:true'))
        // - bob marks the thread markers as read one by one
        fireEvent.click(markAllAsRead)
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('isUnread:false'))

        // mention bob (not worried about tagging his actual display name, the id will do)
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello channel_1 @bob', {
                mentions: [{ userId: bobUserId.textContent!, displayName: 'bob' }],
            })
            await jane.sendMessage(channel_2, 'hello channel_2 @bob', {
                mentions: [{ userId: bobUserId.textContent!, displayName: 'bob' }],
            })
            await jane.sendMessage(channel_2, 'hello thread in channel_2 @bob', {
                threadId: channel_2_message_1.getId(),
                mentions: [{ userId: bobUserId.textContent!, displayName: 'bob' }],
            })
        })
        // do we see mentions?
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('mentions:3'))
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('mentions:1'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('mentions:1'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('mentions:1'))
        // - bob marks the thread markers as read
        fireEvent.click(markAllAsRead)
        // did it work?
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('mentions:0'))
    })
})
