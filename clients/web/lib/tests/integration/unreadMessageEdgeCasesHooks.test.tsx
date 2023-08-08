/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import { RoomVisibility } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import { RoomMessageEvent, TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterAndJoin } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useZionContext } from '../../src/components/ZionContextProvider'

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
        const spaceId = (await createTestSpaceWithEveryoneRole(jane, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        //
        const channelId = (await createTestChannelWithSpaceRoles(jane, {
            name: 'janes channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
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
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }
            return (
                <>
                    <RegisterAndJoin roomIds={[spaceId, channelId]} />
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
        await waitFor(() => expect(joinComplete).toHaveTextContent('true'))
        // check assumptions
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('undefined'))
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
        const event = jane
            .getEvents_Typed<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
            .find(
                (x) =>
                    x.content.body ===
                    `@${bobName} it's Jane! (I'm going to delete this in a second)`,
            )
        expect(event).toBeDefined()

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
        //TODO: enable tests when redaction is implemented
        //await jane.redactEvent(channelId, event!.eventId)

        //Check that unreads go to false and mentions count goes back to 0
        //await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        //await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('mentions:0'))
        //await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))

        // todo send two messages both with mentions

        // todo delete one of them

        // todo test that mentions drops to 1, unread stays true

        // todo delete the second one

        // todo test that mentions drops to 0, unread goes to false
    })
})
