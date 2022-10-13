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
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useChannelId } from '../../src/hooks/use-channel-id'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendReactionHooks', () => {
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
            visibility: RoomVisibility.Public,
            parentSpaceId: janesSpaceId,
        })
        // create a veiw for bob
        const TestRoomMessages = () => {
            const { sendReaction } = useZionClient()
            const channelId = useChannelId()
            const timeline = useChannelTimeline()
            const messages = timeline.filter(
                (x) => x.eventType === ZTEvent.RoomMessage || x.eventType === ZTEvent.Reaction,
            )
            const onSendReaction = useCallback(() => {
                void sendReaction(channelId, messages[0].eventId, '👍')
            }, [channelId, messages, sendReaction])
            // todo redact reaction
            function formatMessage(e: TimelineEvent) {
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }
            return (
                <>
                    <RegisterAndJoinSpace spaceId={janesSpaceId} channelId={janesChannelId} />
                    <button onClick={onSendReaction}>React</button>
                    // hard coding indexes to jump to jane's membership join event
                    <div data-testid="message0">
                        {messages.length > 0 ? formatMessage(messages[0]) : 'empty'}
                    </div>
                    <div data-testid="message1">
                        {messages.length > 1 ? formatMessage(messages[1]) : 'empty'}
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
                        <TestRoomMessages />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const channelMembership = screen.getByTestId('channelMembership')
        const message0 = screen.getByTestId('message0')
        const message1 = screen.getByTestId('message1')
        const sendReactionButton = screen.getByRole('button', {
            name: 'React',
        })
        // wait for client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // wait for the channel join
        await waitFor(() => expect(channelMembership).toHaveTextContent(Membership.Join), {
            timeout: 10000,
        })
        // have jane send a message to bob
        await jane.sendMessage(janesChannelId, 'hello bob')
        // expect our message to show
        await waitFor(() => expect(message0).toHaveTextContent('hello bob'))
        // have bob send a message to jane
        fireEvent.click(sendReactionButton)
        // expect it to render as well
        await waitFor(() => expect(message1).toHaveTextContent(ZTEvent.Reaction))
        // expect jane to recieve the message
        await waitFor(() =>
            expect(
                jane.getRoom(janesChannelId)?.getLiveTimeline().getEvents().at(-1)?.getType(),
            ).toBe(ZTEvent.Reaction),
        )
    })
})
