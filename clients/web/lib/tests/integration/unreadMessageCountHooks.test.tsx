/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { Membership, RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'
import { RegisterWallet } from './helpers/TestComponents'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useSpaceTimeline } from '../../src/hooks/use-space-timeline'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useZionContext } from '../../src/components/ZionContextProvider'
import { sleep } from '../../src/utils/zion-utils'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

// skipped until https://linear.app/hnt-labs/issue/HNT-214/fix-broken-unread-notifications-tests
describe.skip('unreadMessageCountHooks', () => {
    jest.setTimeout(60000)
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // create a space
        const janesSpaceId = await jane.createSpace({
            name: 'janes space',
            visibility: RoomVisibility.Public,
        })
        //
        const janesChannelId = await jane.createChannel({
            name: 'janes channel',
            visibility: RoomVisibility.Private,
            parentSpaceId: janesSpaceId,
        })
        // send 20 messages to the space after we make the channel
        // dendrite doesn't natively send space child events with state
        // if they are too far back we don't know if this room has children
        for (let i = 0; i < 20; i++) {
            await jane.sendMessage(janesSpaceId, 'hi ' + i.toString())
        }
        // create a veiw for bob
        const TestComponent = () => {
            const { joinRoom, sendMessage, sendReadReceipt } = useZionClient()
            const { unreadCounts, spaceUnreads } = useZionContext()
            const unreadCount = unreadCounts[janesChannelId.matrixRoomId]
            const spaceUnreadCount = unreadCounts[janesSpaceId.matrixRoomId]
            const spaceHasUnread = spaceUnreads[janesSpaceId.matrixRoomId]
            const mySpaceMembership = useMyMembership(janesSpaceId)
            const myChannelMembership = useMyMembership(janesChannelId)
            const spaceTimeline = useSpaceTimeline()
            const timeline = useChannelTimeline()
            const messages = timeline.filter((x) => x.eventType === ZTEvent.RoomMessage)
            // handle join
            const onClickJoinSpace = useCallback(() => {
                void joinRoom(janesSpaceId)
            }, [joinRoom])
            // handle join
            const onClickJoinChannel = useCallback(() => {
                void joinRoom(janesChannelId)
            }, [joinRoom])
            // send message
            const onClickSendMessage = useCallback(() => {
                void sendMessage(janesChannelId, 'hello jane')
            }, [sendMessage])
            // send read receipt
            const onMarkAsRead = useCallback(() => {
                if (spaceUnreadCount > 0) {
                    // this one is pretty weird, seems like every 10th run the server laggs
                    // and we receive a few space messages after we join the channel
                    // and end up with some space unread counts
                    void sendReadReceipt(janesSpaceId, spaceTimeline.at(-1)!.eventId)
                }
                if (unreadCount > 0) {
                    void sendReadReceipt(janesChannelId, messages.at(-1)!.eventId)
                }
            }, [messages, sendReadReceipt, spaceTimeline, spaceUnreadCount, unreadCount])
            // format for easy reading
            function formatMessage(e: TimelineEvent) {
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }
            return (
                <>
                    <RegisterWallet />
                    <div data-testid="spaceMembership"> {mySpaceMembership} </div>
                    <div data-testid="channelMembership"> {myChannelMembership} </div>
                    <button onClick={onClickJoinSpace}>join space</button>
                    <button onClick={onClickJoinChannel}>join channel</button>
                    <button onClick={onMarkAsRead}>mark as read</button>
                    <button onClick={onClickSendMessage}>Send Message</button>
                    <div data-testid="spaceUnreadCount"> {spaceUnreadCount} </div>
                    <div data-testid="spaceHasUnread">
                        {spaceHasUnread === undefined ? 'undefined' : spaceHasUnread.toString()}
                    </div>
                    <div data-testid="unreadCount">
                        {unreadCount === undefined ? 'undefined' : unreadCount.toString()}
                    </div>
                    <div data-testid="lastMessage">
                        {messages.length > 0 ? formatMessage(messages.at(-1)!) : 'empty'}
                    </div>
                    <div id="allMessages">
                        {timeline.map((event) => formatMessage(event)).join('\n')}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={bobProvider}>
                <SpaceContextProvider spaceId={janesSpaceId}>
                    <ChannelContextProvider channelId={janesChannelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const bobId = screen.getByTestId('userId')
        const clientRunning = screen.getByTestId('clientRunning')
        const spaceMembership = screen.getByTestId('spaceMembership')
        const channelMembership = screen.getByTestId('channelMembership')
        const lastMessage = screen.getByTestId('lastMessage')
        const spaceHasUnread = screen.getByTestId('spaceHasUnread')
        const unreadCount = screen.getByTestId('unreadCount')
        const joinSpaceButton = screen.getByRole('button', {
            name: 'join space',
        })
        const joinChannelButton = screen.getByRole('button', {
            name: 'join channel',
        })
        const markAsReadButton = screen.getByRole('button', {
            name: 'mark as read',
        })
        const sendMessageButton = screen.getByRole('button', {
            name: 'Send Message',
        })

        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // join the space
        fireEvent.click(joinSpaceButton)
        // wait for space join
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join), {
            timeout: 10000,
        })
        // check assumptions
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('undefined'))
        // get invited to the channel
        await jane.inviteUser(janesChannelId, bobId.textContent!)
        // check the count (9/28/2022 dendrite doesn't send notifications for invites)
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('undefined'))
        // join the space
        fireEvent.click(joinChannelButton)
        // wait for the channel join
        await waitFor(() => expect(channelMembership).toHaveTextContent(Membership.Join))
        // have jane send a message to bob
        await jane.sendMessage(janesChannelId, 'hello bob')
        // expect our message to show
        await waitFor(() => expect(lastMessage).toHaveTextContent('hello bob'))
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('2'))
        // mark as read
        fireEvent.click(markAsReadButton)
        // check count
        await waitFor(() => expect(unreadCount).toHaveTextContent('0'))
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        // have jane send a message to bob
        await jane.sendMessage(janesChannelId, "it's Jane!")
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('1'))
        // send another message
        await jane.sendMessage(janesChannelId, 'rember me!')
        // sending a message doesn't reset the count
        fireEvent.click(sendMessageButton)
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('2'))
        // send a message back
        fireEvent.click(markAsReadButton)
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(unreadCount).toHaveTextContent('0'))
        // have jane create a new room and invite bob
        const newRoomId = await jane.createChannel({
            name: 'janes channel',
            visibility: RoomVisibility.Private,
            parentSpaceId: janesSpaceId,
        })
        // give bob a chance to see the new space.child message
        // when we get an invite it doesn't come with any space info
        // because the previous time we fetched the space we didn't have permission to see this space
        // we didn't sync it
        // it might exist in the timeline in a space.child event, but it probably won't be in the recent timeline
        // and it's not a state event
        await sleep(1000)
        // get invited to the channel
        await jane.inviteUser(newRoomId, bobId.textContent!)
        // the space should show the unread count, but we don't (9/28/2022 dendrite doesn't send notifications for invites)
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
    })
})
