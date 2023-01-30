/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership, RoomVisibility } from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import React, { useCallback, useMemo } from 'react'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelId } from '../../src/hooks/use-channel-id'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendMessageHooks', () => {
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        const { jane } = await registerAndStartClients(['jane'])
        // jane needs funds to create a space
        await jane.fundWallet()
        // create a space
        const janesSpaceId = (await createTestSpaceWithEveryoneRole(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // create a space
        //
        let janesChannelId: RoomIdentifier
        if (janesSpaceId) {
            janesChannelId = (await createTestChannelWithSpaceRoles(jane, {
                name: 'janes channel',
                parentSpaceId: janesSpaceId,
                visibility: RoomVisibility.Public,
                roleIds: [],
            })) as RoomIdentifier
        }
        // create a veiw for bob
        const TestRoomMessages = () => {
            const { sendMessage, editMessage, redactEvent } = useZionClient()
            const channelId = useChannelId()
            const { timeline } = useChannelTimeline()
            const [msgSent, setMsgSent] = React.useState(false)
            const [msgEdited, setMsgEdited] = React.useState(false)

            const messagesOrRedactions = useMemo(
                () =>
                    timeline.filter(
                        (x) =>
                            x.content?.kind === ZTEvent.RoomMessage ||
                            x.content?.kind === ZTEvent.RoomRedaction,
                    ),
                [timeline],
            )
            // send message
            const onClickSendMessage = useCallback(() => {
                void (async () => {
                    await sendMessage(janesChannelId, 'hello jane')
                    setMsgSent(true)
                })()
            }, [sendMessage])
            // edit message
            const onEdit = useCallback(() => {
                void (async () => {
                    console.log(`onEdit`, messagesOrRedactions[1].eventId)
                    await editMessage(
                        channelId,
                        'hello jane gm!',
                        {
                            originalEventId: messagesOrRedactions[1].eventId,
                        },
                        undefined,
                    )
                    setMsgEdited(true)
                })()
            }, [channelId, editMessage, messagesOrRedactions])
            // redact message
            const onRedact = useCallback(() => {
                void redactEvent(channelId, messagesOrRedactions[1].eventId)
            }, [channelId, messagesOrRedactions, redactEvent])
            // format for easy reading
            const formatMessage = useCallback((e: TimelineEvent) => {
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }, [])
            return (
                <>
                    <RegisterAndJoinSpace spaceId={janesSpaceId} channelId={janesChannelId} />
                    <button onClick={onClickSendMessage}>Send Message</button>
                    <button onClick={onEdit}>Edit</button>
                    <button onClick={onRedact}>Redact</button>
                    <div data-testid="message0">
                        {messagesOrRedactions.length > 0
                            ? formatMessage(messagesOrRedactions[0])
                            : 'empty'}
                    </div>
                    <div data-testid="msgSent">{msgSent ? 'message sent' : 'message not sent'}</div>
                    <div data-testid="msgEdited">
                        {msgEdited ? 'message edited' : 'message not edited'}
                    </div>

                    <div data-testid="message1">
                        {messagesOrRedactions.length > 1
                            ? formatMessage(messagesOrRedactions[1])
                            : 'empty'}
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
                    <ChannelContextProvider channelId={janesChannelId!}>
                        <TestRoomMessages />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const channelMembership = screen.getByTestId('channelMembership')
        const msgSent = screen.getByTestId('msgSent')
        const msgEdited = screen.getByTestId('msgEdited')
        const message0 = screen.getByTestId('message0')
        const message1 = screen.getByTestId('message1')
        const sendMessageButton = screen.getByRole('button', {
            name: 'Send Message',
        })
        const editButton = screen.getByRole('button', { name: 'Edit' })
        const redactButton = screen.getByRole('button', { name: 'Redact' })
        // wait for client to be running
        await waitFor(
            () => expect(clientRunning).toHaveTextContent('true'),
            TestConstants.DefaultWaitForTimeout,
        )
        // wait for the channel join
        await waitFor(
            () => expect(channelMembership).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        // have jane send a message to bob
        await act(async () => {
            await jane.sendMessage(janesChannelId, 'hello bob')
        })
        // expect our message to show
        await waitFor(
            () => expect(message0).toHaveTextContent('hello bob'),
            TestConstants.DefaultWaitForTimeout,
        )
        // have bob send a message to jane
        fireEvent.click(sendMessageButton)

        // wait for the event to be sent
        await waitFor(
            () => expect(msgSent).toHaveTextContent('message sent'),
            TestConstants.DefaultWaitForTimeout,
        )

        // expect it to render as well
        await waitFor(
            () => expect(message1).toHaveTextContent('hello jane'),
            TestConstants.DefaultWaitForTimeout,
        )
        // expect jane to recieve the message
        await waitFor(
            () =>
                expect(
                    jane
                        .getRoom(janesChannelId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .filter((e) => e.getType() === 'm.room.message')
                        .at(-1)
                        ?.getContent().body,
                ).toBe('hello jane'),
            TestConstants.DefaultWaitForTimeout,
        )
        // edit the event
        fireEvent.click(editButton)
        // wait for the event to be edited
        await waitFor(
            () => expect(msgEdited).toHaveTextContent('message edited'),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(message1).toHaveTextContent('hello jane gm!'),
            TestConstants.DefaultWaitForTimeout,
        )
        // expect jane to see the edited event
        await waitFor(
            () =>
                expect(
                    jane
                        .getRoom(janesChannelId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .filter((e) => e.getType() === 'm.room.message')
                        .at(-1)
                        ?.getContent().body,
                ).toBe('hello jane gm!'),
            TestConstants.DefaultWaitForTimeout,
        )
        // redact the event
        fireEvent.click(redactButton)
        // exect the message to be empty
        await waitFor(
            () => expect(message1).toHaveTextContent('m.room.redaction'),
            TestConstants.DefaultWaitForTimeout,
        )
    })
})
