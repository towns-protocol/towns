/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import React, { useCallback, useMemo } from 'react'
import { setTimeout } from 'timers/promises'
import { FullyReadMarker } from '@river/proto'
import { Permission } from '@river/web3'
import {
    RoomMessageEvent,
    ThreadResult,
    ThreadStats,
    TimelineEvent,
} from '../../src/types/timeline-types'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { RegisterAndJoin } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelThreadStats } from '../../src/hooks/use-channel-thread-stats'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { useSpaceNotificationCounts } from '../../src/hooks/use-space-notification-counts'
import { useSpaceThreadRoots } from '../../src/hooks/use-space-thread-roots'
import { useTimelineThread } from '../../src/hooks/use-timeline-thread'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useTimeline } from '../../src/hooks/use-timeline'
import { TestConstants } from './helpers/TestConstants'
import { TSigner } from '../../src/types/web3-types'

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
        await bobProvider.fundWallet()

        // jane needs funds to create a spaceß
        await jane.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceGatedByTownNft(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes space'),
            },
        )) as string
        // create channels
        const channel_1 = (await createTestChannelWithSpaceRoles(jane, {
            name: 'channel_1',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string
        const channel_2 = (await createTestChannelWithSpaceRoles(jane, {
            name: 'channel_2',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string

        // 3 chnannels should exist b/c of default channel
        await waitFor(
            async () => expect((await jane.spaceDapp.getChannels(spaceId)).length).toBe(3),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // render bob's app
        const TestChannelComponent = ({ signer }: { signer: TSigner }) => {
            const { sendMessage, editMessage, sendReadReceipt } = useZionClient()
            const threadRoots = useSpaceThreadRoots()
            const { timeline: channelTimeline } = useChannelTimeline()
            const { timeline: channel_2_timeline } = useTimeline(channel_2)
            const channelThreadStats = useChannelThreadStats()
            const spaceNotifications = useSpaceNotificationCounts(spaceId)
            const channel_1_fullyRead = useFullyReadMarker(channel_1)
            const channel_2_fullyRead = useFullyReadMarker(channel_2)
            const [unreadInProgress, setUnreadInProgress] = React.useState({
                semaphore: 0,
                started: 0,
                completed: 0,
            })
            const [sendInitialMessageInProgress, setSendInitialMessageInProgress] = React.useState({
                semaphore: 0,
                started: 0,
                completed: 0,
            })

            const channel_2_threadRoot = useMemo(
                () => Object.values(threadRoots).at(0),
                [threadRoots],
            )

            const channel_2_thread = useTimelineThread(
                channel_2,
                channel_2_threadRoot?.thread.parentId,
            )
            const channel_2_thread_fullyRead = useFullyReadMarker(
                channel_2,
                channel_2_threadRoot?.thread.parentId,
            )

            const sendInitialMessages = useCallback(() => {
                void (async () => {
                    setSendInitialMessageInProgress((prev) => ({
                        ...prev,
                        semaphore: prev.semaphore + 1,
                        started: prev.started + 1,
                    }))

                    await sendMessage(channel_1, 'hello jane in channel_1')
                    await sendMessage(channel_2, 'hello jane in channel_2')
                    setSendInitialMessageInProgress((prev) => ({
                        ...prev,
                        semaphore: prev.semaphore - 1,
                        completed: prev.completed + 1,
                    }))
                    console.log(`sendInitialMessages finished`)
                })()
            }, [sendMessage])

            const editChannel2Message1 = useCallback(() => {
                void (async () => {
                    if (!channel_2_threadRoot) {
                        throw new Error('no channel_2_threadRoot')
                    }
                    if (!channel_2_threadRoot.thread.parentMessageContent) {
                        throw new Error('no channel_2_threadRoot.thread.parentMessageContent')
                    }
                    const channelId = channel_2_threadRoot.channel.id
                    const messageId = channel_2_threadRoot.thread.parentId
                    await editMessage(
                        channelId,
                        messageId,
                        channel_2_threadRoot.thread.parentMessageContent,
                        'hello jane old friend in channel_2',
                        undefined,
                    )
                    console.log(`editChannel2Message1 finished`)
                })()
            }, [editMessage, channel_2_threadRoot])

            const markAllAsRead = useCallback(() => {
                console.log(`markAllAsRead started`)
                void (async () => {
                    setUnreadInProgress((prev) => ({
                        ...prev,
                        semaphore: prev.semaphore + 1,
                        started: prev.started + 1,
                    }))

                    if (
                        !channel_1_fullyRead ||
                        !channel_2_fullyRead ||
                        !channel_2_thread_fullyRead
                    ) {
                        throw new Error('undefined fullyReadMarker')
                    }

                    await sendReadReceipt(channel_1_fullyRead)
                    await sendReadReceipt(channel_2_fullyRead)
                    await sendReadReceipt(channel_2_thread_fullyRead)

                    setUnreadInProgress((prev) => ({
                        ...prev,
                        semaphore: prev.semaphore - 1,
                        completed: prev.completed + 1,
                    }))
                    console.log(`markAllAsRead done`)
                })()
            }, [
                channel_1_fullyRead,
                channel_2_fullyRead,
                channel_2_thread_fullyRead,
                sendReadReceipt,
            ])

            const formatThreadParent = useCallback((t: ThreadStats) => {
                return `replyCount: (${t.replyCount}) parentId: (${t.parentId}) message: (${
                    t.parentMessageContent?.body ?? ''
                })`
            }, [])

            const formatThreadRoot = useCallback(
                (t: ThreadResult) => {
                    const mentions = t.fullyReadMarker?.mentions ?? 0
                    return (
                        `channel: (${
                            t.channel.label
                        }) isUnread: (${t.isUnread.toString()}) mentions: (${mentions}) ` +
                        formatThreadParent(t.thread)
                    )
                },
                [formatThreadParent],
            )

            const formatMessage = useCallback(
                (e: TimelineEvent, v?: 'short') => {
                    const replyCount = channelThreadStats[e.eventId]?.replyCount
                    const replyCountStr = replyCount ? `(replyCount:${replyCount})` : ''
                    const eventNumStr = `${e.eventNum}/${e.confirmedEventNum ?? '??'}`
                    const idStr = `id: ${e.eventId}`
                    const content = v !== undefined ? '' : `content: ${JSON.stringify(e.content)}`
                    return `${eventNumStr}} ${e.fallbackContent} ${replyCountStr} ${idStr} ${content}`
                },
                [channelThreadStats],
            )
            const formatThreadStats = useCallback((k: string, v: ThreadStats) => {
                return `${k} (replyCount:${v.replyCount} userIds:${[...v.userIds].join(',')})`
            }, [])

            const formatFullyReadMarker = useCallback((m?: FullyReadMarker) => {
                return m === undefined
                    ? 'undefined'
                    : `isUnread:${m.isUnread.toString()} eventId: ${m.eventId} mentions:${
                          m.mentions
                      }`
            }, [])

            const threadRootsContent = useMemo(
                () => threadRoots.map((t) => formatThreadRoot(t)).join('\n'),
                [formatThreadRoot, threadRoots],
            )

            return (
                <>
                    <RegisterAndJoin
                        spaceId={spaceId}
                        channelIds={[channel_1, channel_2]}
                        signer={signer}
                    />
                    <button onClick={sendInitialMessages}>sendInitialMessages</button>
                    <button onClick={editChannel2Message1}>editChannel2Message1</button>
                    <button onClick={markAllAsRead}>markAllAsRead</button>
                    <div data-testid="info">
                        {JSON.stringify({
                            channel_1: channel_1,
                            channel_2: channel_2,
                            spaceId: spaceId,
                        })}
                    </div>
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
                    <div data-testid="threadRoots">{threadRootsContent}</div>
                    <div data-testid="channel2ThreadParent">
                        {channel_2_thread?.parent
                            ? formatThreadParent(channel_2_thread.parent)
                            : undefined}
                    </div>
                    <div data-testid="channel2ThreadMessages">
                        {channel_2_thread?.messages?.map((e) => `${formatMessage(e)}`).join('\n') ??
                            ''}
                    </div>
                    <div data-testid="channelMessages">
                        {channelTimeline
                            .map((event) => `${formatMessage(event, 'short')}`)
                            .join('\n')}
                    </div>
                    <div data-testid="channel_2_messages">
                        {channel_2_timeline
                            .map((event) => `${formatMessage(event, 'short')}`)
                            .join('\n')}
                    </div>
                    <div data-testid="channelThreadStats">
                        {Object.entries(channelThreadStats)
                            .map((kv) => formatThreadStats(kv[0], kv[1]))
                            .join('\n')}
                    </div>
                    <div data-testid="unreadInProgress">{JSON.stringify(unreadInProgress)}</div>
                    <div data-testid="sendInitialMessageInProgress">
                        {JSON.stringify(sendInitialMessageInProgress)}
                    </div>
                </>
            )
        }
        render(
            <ZionTestApp provider={bobProvider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channel_1}>
                        <TestChannelComponent signer={bobProvider.wallet} />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )

        const bobUserId = screen.getByTestId('userId')
        const clientRunning = screen.getByTestId('clientRunning')
        const joinComplete = screen.getByTestId('joinComplete')
        const channelMessages = screen.getByTestId('channelMessages')
        const channel_2_messages = screen.getByTestId('channel_2_messages')
        const channel2ThreadParent = screen.getByTestId('channel2ThreadParent')
        const channel2ThreadMessages = screen.getByTestId('channel2ThreadMessages')
        const spaceNotifications = screen.getByTestId('spaceNotifications')
        const channel_1_fullyRead = screen.getByTestId('channel_1_fullyRead')
        const channel_2_fullyRead = screen.getByTestId('channel_2_fullyRead')
        const channel_2_thread_fullyRead = screen.getByTestId('channel_2_thread_fullyRead')
        const threadRoots = screen.getByTestId('threadRoots')
        const sendInitialMessagesButton = screen.getByRole('button', {
            name: 'sendInitialMessages',
        })
        const editChannel2Message1 = screen.getByRole('button', {
            name: 'editChannel2Message1',
        })
        const markAllAsRead = screen.getByRole('button', { name: 'markAllAsRead' })

        // - bob joins the space and both channels
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        await waitFor(
            () => expect(joinComplete).toHaveTextContent('true'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        const unreadInProgress = screen.getByTestId('unreadInProgress')

        // - bob renders channel_1
        await waitFor(() => expect(channelMessages).toHaveTextContent('m.room.create'))

        // - bob sends a message in each channel
        fireEvent.click(sendInitialMessagesButton)
        // add a delay to make sure the messages update in timeline
        await setTimeout(10)
        // wait for bob's messages to appear in the timeline in the case that it took multiple retries
        await waitFor(
            () => expect(channelMessages).toHaveTextContent('hello jane in channel_1'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(channel_2_messages).toHaveTextContent('hello jane in channel_2'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // - jane sends messages
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello channel_1')
            await jane.sendMessage(channel_2, 'hello channel_2')
            console.log(`jane hello channels sent`)
        })
        const channel_1_message_0 = jane
            .getEvents_TypedRoomMessage(channel_1)!
            .find((e) => e.content.body === 'hello channel_1')!
        await waitFor(() => expect(channel_1_message_0.eventId.startsWith('~')).toBe(false))

        // - bob renders channel_1
        await waitFor(
            () => expect(channelMessages).toHaveTextContent('hello channel_1'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // - jane replies to janes's message in channel_1 creating channel_1.thread
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello thread in channel_1', {
                threadId: channel_1_message_0.eventId,
            })
        })
        // - bob sees thread stats on chanel_1.message_1
        await waitFor(() =>
            expect(channelMessages).toHaveTextContent('hello channel_1 (replyCount:1)'),
        )
        // - jane messages again
        await act(async () => {
            await jane.sendMessage(channel_1, 'hello again in channel_1', {
                threadId: channel_1_message_0.eventId,
            })
        })
        // - bob sees thread stats on chanel_1.message_1
        await waitFor(() =>
            expect(channelMessages).toHaveTextContent('hello channel_1 (replyCount:2)'),
        )
        // - jane replies to bobs's message in channel_2 creating channel_2.thread
        await waitFor(
            () => expect(jane.getMessages(channel_2)).toContain('hello jane in channel_2'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        const channel_2_message_1 = jane
            .getEvents_TypedRoomMessage(channel_2)!
            .find((e) => e.content.body === 'hello jane in channel_2')!

        await act(async () => {
            await jane.sendMessage(channel_2, 'hello thread in channel_2', {
                threadId: channel_2_message_1.eventId,
            })
        })
        // -- bob should see the channel_2.thread in his thread list
        await waitFor(() =>
            expect(threadRoots).toHaveTextContent(
                `channel: (channel_2) isUnread: (true) mentions: (0) replyCount: (1) parentId: (${channel_2_message_1.eventId})`,
            ),
        )
        // -- bob should not see the channel_1.thread in his thread list
        await waitFor(() => expect(threadRoots).not.toHaveTextContent(`channel: (channel_1)`))
        // -- bob should see the thread root message in is thread list
        await waitFor(
            () => expect(threadRoots).toHaveTextContent(`hello jane in channel_2`),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // -- bob edits is message in channel_2
        fireEvent.click(editChannel2Message1)
        // -- bob sees thread root updated
        await waitFor(() =>
            expect(threadRoots).toHaveTextContent(`hello jane old friend in channel_2`),
        )
        // -- and the thread parent (different hook)
        await waitFor(() =>
            expect(channel2ThreadParent).toHaveTextContent('hello jane old friend in channel_2'),
        )
        // -- and the thread messages
        await waitFor(() =>
            expect(channel2ThreadMessages).toHaveTextContent('hello thread in channel_2'),
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
            await jane.sendMessage(channel_2, 'whats up bob! thread in channel_2 @bob', {
                threadId: channel_2_message_1.eventId,
                mentions: [{ userId: bobUserId.textContent!, displayName: 'bob' }],
            })
        })
        // do we see mentions?
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('mentions:1'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('mentions:1'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('mentions:1'))
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('mentions:3'))
        // -- and the message
        await waitFor(() => expect(channel2ThreadMessages).toHaveTextContent('whats up bob!'))
        // - bob marks the thread markers as read
        fireEvent.click(markAllAsRead)
        // did it work?
        await waitFor(() => expect(spaceNotifications).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_1_fullyRead).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_2_fullyRead).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channel_2_thread_fullyRead).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(unreadInProgress).toHaveTextContent('0'))

        // get our threaded message...
        await waitFor(
            async () => expect(await jane.getLatestEvent<RoomMessageEvent>(channel_2)).toBeTruthy(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        let event = await jane.getLatestEvent<RoomMessageEvent>(channel_2)
        expect(event?.threadParentId).toBe(channel_2_message_1.eventId)
        expect(event?.content.body).toContain('whats up bob!')

        // can we edit it?
        await act(async () => {
            if (!event) {
                throw new Error('no event')
            }
            await jane.editMessage(
                channel_2,
                event.eventId,
                event.content,
                'Im a turtle!',
                undefined,
            )
        })
        // what does bob see?
        await waitFor(() => expect(channel2ThreadMessages).not.toHaveTextContent('whats up bob!'))
        await waitFor(() => expect(channel2ThreadMessages).toHaveTextContent('Im a turtle!'))

        // refetch the event
        const ogEventId = event?.eventId
        event = await jane.getLatestEvent<RoomMessageEvent>(channel_2)
        expect(event?.threadParentId).toBe(channel_2_message_1.eventId)
        expect(event?.content.body).toContain('Im a turtle!')
        expect(event?.content.editsEventId).toBe(ogEventId)

        // can we delete it?
        await act(async () => {
            if (!event || !event.content.editsEventId) {
                throw new Error('no event')
            }
            await jane.redactEvent(channel_2, event.content.editsEventId)
        })
        // what does bob see?
        await waitFor(() => expect(channel2ThreadMessages).not.toHaveTextContent('Im a turtle!'))
    }, 240_000)
})
