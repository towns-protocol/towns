/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import React, { useCallback } from 'react'
import { RoomMessageEvent, TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
} from './helpers/TestUtils'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useZionContext } from '../../src/components/ZionContextProvider'
import { TestConstants } from './helpers/TestConstants'

// make sure things like deleting messages don't cause the unread count to go bad
describe('unreadMessageCountEdgeCases', () => {
    test('user sees correct unread message counts', async () => {
        // create clients
        const { jane, bob } = await registerAndStartClients(['jane', 'bob'])
        const bobName = bob.name
        const bobUserId = bob.getUserId()!
        await bob.logout()
        // jane needs funds to create a space
        await jane.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceGatedByTownNft(jane, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        //
        const channelId = (await createTestChannelWithSpaceRoles(jane, {
            name: 'janes channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier

        // create a veiw for bob
        const TestComponent = () => {
            const { sendReadReceipt } = useZionClient()
            const { spaceUnreads } = useZionContext()
            const channelFullyReadMarker = useFullyReadMarker(channelId)
            const { timeline } = useChannelTimeline()
            const spaceHasUnread = spaceUnreads[spaceId.networkId]
            const messages = timeline.filter((x) => x.content?.kind === ZTEvent.RoomMessage)
            // send message
            const onMarkAsRead = useCallback(() => {
                if (channelFullyReadMarker?.isUnread === true) {
                    void sendReadReceipt(channelFullyReadMarker)
                }
            }, [channelFullyReadMarker, sendReadReceipt])
            // format for easy reading
            function formatMessage(e: TimelineEvent) {
                return `${e.eventNum} ${e.fallbackContent} eventId: ${e.eventId}`
            }
            return (
                <>
                    <RegisterAndJoinSpace spaceId={spaceId} channelId={channelId} />
                    <button onClick={onMarkAsRead}>mark as read</button>
                    <div data-testid="spaceHasUnread">
                        {spaceHasUnread === undefined ? 'undefined' : spaceHasUnread.toString()}
                    </div>
                    <div data-testid="channelFullyReadMarker">
                        {channelFullyReadMarker === undefined
                            ? 'undefined'
                            : `isUnread:${channelFullyReadMarker.isUnread.toString()} mentions:${channelFullyReadMarker.mentions.toString()} eventId:${
                                  channelFullyReadMarker.eventId
                              }`}
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
            <ZionTestApp provider={bob.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )

        // get our test elements
        // const bobId = screen.getByTestId('userId')
        const clientRunning = screen.getByTestId('clientRunning')
        const joinComplete = screen.getByTestId('joinComplete')
        const lastMessage = screen.getByTestId('lastMessage')
        const spaceHasUnread = screen.getByTestId('spaceHasUnread')
        const channelFullyReadMarker = screen.getByTestId('channelFullyReadMarker')
        const markAsReadButton = screen.getByRole('button', {
            name: 'mark as read',
        })

        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // wait for space and channel join
        await waitFor(
            () => expect(joinComplete).toHaveTextContent('true'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // check assumptions
        await waitFor(() =>
            expect(channelFullyReadMarker).toHaveTextContent('isUnread:false mentions:0'),
        )
        // have jane send a message to bob
        await act(() => jane.sendMessage(channelId, 'hello bob'))
        // expect our message to show
        await waitFor(() => expect(lastMessage).toHaveTextContent('hello bob'))
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        // mark as read
        fireEvent.click(markAsReadButton)
        // check count
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        // have jane send a message to bob
        await act(() =>
            jane.sendMessage(
                channelId,
                `@${bobName} it's Jane! (I'm going to delete this in a second)`,
                { mentions: [{ displayName: bobName, userId: bobUserId }] },
            ),
        )
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))
        // have jane delete the message
        const event = await waitFor(() => {
            const event = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `@${bobName} it's Jane! (I'm going to delete this in a second)`,
                )
            expect(event).toBeDefined()
            return event
        })

        //Edit the message to remove the mention
        await jane.editMessage(
            channelId,
            event!.eventId,
            event!.content,
            'its Jane! but no mention',
            undefined,
        )

        // unread should still be true, but mentions should go to 0
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))

        //Edit a mention back into the message, check that mentions goes back to 1
        await jane.editMessage(
            channelId,
            event!.eventId,
            event!.content,
            `@${bobName} its Jane! but no mention`,
            { mentions: [{ displayName: bobName, userId: bobUserId }] },
        )
        //Unread should still be true, but mentions should go back to 1
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))

        //Delete the message
        await jane.redactEvent(channelId, event!.eventId)

        //Check that unreads go to false and mentions count goes back to 0
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))

        //Send two messages both with mentions
        await act(() =>
            jane.sendMessage(
                channelId,
                `@${bobName}, it is first message from Jane (I'm going to delete this in a second too)1`,
                { mentions: [{ displayName: bobName, userId: bobUserId }] },
            ),
        )

        await act(() =>
            jane.sendMessage(
                channelId,
                `@${bobName}, it is second message from Jane (I'm going to delete this in a second too)2`,
                { mentions: [{ displayName: bobName, userId: bobUserId }] },
            ),
        )

        const deletedEvent1 = await waitFor(() => {
            const event = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `@${bobName}, it is first message from Jane (I'm going to delete this in a second too)1`,
                )
            expect(event).toBeDefined()
            return event
        })

        const deletedEvent2_eventId = await waitFor(() => {
            const eventId = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `@${bobName}, it is second message from Jane (I'm going to delete this in a second too)2`,
                )?.eventId
            expect(eventId).toBeDefined()
            return eventId
        })

        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:2'))

        //Delete first message
        await jane.redactEvent(channelId, deletedEvent1!.eventId)

        //Test that mentions drops to 1, unread stays true
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))

        //Delete the second one
        await jane.redactEvent(channelId, deletedEvent2_eventId!)
        //Test that mentions drops to 0, unread goes to false
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))

        //Send two messages - first with mention, second - not
        await act(() =>
            jane.sendMessage(
                channelId,
                `@${bobName}, it is first message from Jane with mention (I'm going to delete this in a second too)`,
                { mentions: [{ displayName: bobName, userId: bobUserId }] },
            ),
        )

        await act(() =>
            jane.sendMessage(
                channelId,
                `It is second message from Jane without mention (I'm going to delete this in a second too)`,
            ),
        )

        const deletedEventWithMention = await waitFor(() => {
            const event = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `@${bobName}, it is first message from Jane with mention (I'm going to delete this in a second too)`,
                )
            expect(event).toBeDefined()
            return event
        })

        const deletedEventWithoutMention_eventId = await waitFor(() => {
            const eventId = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `It is second message from Jane without mention (I'm going to delete this in a second too)`,
                )?.eventId
            expect(eventId).toBeDefined()
            return eventId
        })

        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))

        //Delete first message without mention
        await jane.redactEvent(channelId, deletedEventWithoutMention_eventId!)

        //Test that mentions stays at 1, unread stays true
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))

        //Delete the second one with mention
        await jane.redactEvent(channelId, deletedEventWithMention!.eventId)
        //Test that mentions drops to 0, unread goes to false
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))

        //Send two messages - first with mention, second - not
        await act(() =>
            jane.sendMessage(
                channelId,
                `@${bobName}, it is first message from Jane again with mention (I'm going to delete this in a second too)`,
                { mentions: [{ displayName: bobName, userId: bobUserId }] },
            ),
        )

        await act(() =>
            jane.sendMessage(
                channelId,
                `It is second message from Jane again without mention (I'm going to delete this in a second too)`,
            ),
        )

        const deletedEventWithMention2 = await waitFor(() => {
            const event = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `@${bobName}, it is first message from Jane again with mention (I'm going to delete this in a second too)`,
                )
            expect(event).toBeDefined()
            return event
        })

        const deletedEventWithoutMention2_eventId = await waitFor(() => {
            const returnVal = jane
                .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
                .find(
                    (x) =>
                        x.content.body ===
                        `It is second message from Jane again without mention (I'm going to delete this in a second too)`,
                )?.eventId
            expect(returnVal).toBeDefined()
            return returnVal
        })
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:1'))

        //Delete first message with mention
        await jane.redactEvent(channelId, deletedEventWithMention2!.eventId)

        //Test that mentions drops to 0, unread stays true
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))

        //Delete the second one
        await jane.redactEvent(channelId, deletedEventWithoutMention2_eventId!)
        //Test that mentions drops to 0, unread goes to false
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))
    }, 180_000)
})
