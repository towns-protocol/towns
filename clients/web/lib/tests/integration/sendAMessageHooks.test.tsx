/**
 * sendAMessageHooks
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership } from '../../src/types/towns-types'
import React, { useCallback, useMemo } from 'react'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { useChannelId } from '../../src/hooks/use-channel-id'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { TestConstants } from './helpers/TestConstants'
import { TSigner } from '../../src/types/web3-types'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendMessageHooks', () => {
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        // create a wallet for bob
        const bobProvider = new TownsTestWeb3Provider()
        // bob needs funds to mint
        await bobProvider.fundWallet()

        const { jane } = await registerAndStartClients(['jane'])
        // jane needs funds to create a space
        await jane.fundWallet()
        // create a space
        const janesSpaceId = (await createTestSpaceGatedByTownNft(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes space'),
            },
        )) as string
        // create a space
        //
        let janesChannelId: string
        if (janesSpaceId) {
            janesChannelId = (await createTestChannelWithSpaceRoles(jane, {
                name: 'janes channel',
                parentSpaceId: janesSpaceId,
                roleIds: [],
            })) as string
        }
        // create a veiw for bob
        const TestRoomMessages = ({ signer }: { signer: TSigner }) => {
            const { sendMessage, editMessage, redactEvent } = useTownsClient()
            const channelId = useChannelId()
            const { timeline } = useChannelTimeline()
            const [msgSent, setMsgSent] = React.useState(false)
            const [msgEdited, setMsgEdited] = React.useState(false)

            const messagesOrRedactions = useMemo(
                () =>
                    timeline.filter(
                        (x) =>
                            x.content?.kind === ZTEvent.RoomMessage ||
                            x.content?.kind === ZTEvent.RedactionActionEvent,
                    ),
                [timeline],
            )
            // send message
            const onClickSendMessage = useCallback(() => {
                console.log(`sendAMessage::onClickSendMessage`, { janesChannelId })
                void (async () => {
                    await sendMessage(janesChannelId, 'hello jane')
                    setMsgSent(true)
                })()
            }, [sendMessage])
            // edit message
            const onEdit = useCallback(() => {
                console.log(`sendAMessage::onEdit`, {
                    janesChannelId,
                    eventId: messagesOrRedactions[1].eventId,
                })
                void (async () => {
                    console.log(`onEdit`, messagesOrRedactions[1].eventId)
                    if (messagesOrRedactions[1].content?.kind !== ZTEvent.RoomMessage) {
                        throw new Error('not a message')
                    }
                    await editMessage(
                        channelId,
                        messagesOrRedactions[1].eventId,
                        messagesOrRedactions[1].content,
                        'hello jane gm!',
                        undefined,
                    )
                    setMsgEdited(true)
                })()
            }, [channelId, editMessage, messagesOrRedactions])
            // redact message
            const onRedact = useCallback(() => {
                console.log(`sendAMessage::onRedact`, {
                    janesChannelId,
                    eventId: messagesOrRedactions[1].eventId,
                })
                void redactEvent(channelId, messagesOrRedactions[1].eventId)
            }, [channelId, messagesOrRedactions, redactEvent])
            // format for easy reading
            const formatMessage = useCallback((e: TimelineEvent) => {
                const prefix = `#:${e.eventNum} ✅:${e.confirmedEventNum ?? '??'}`
                if (e.content?.kind === ZTEvent.RoomMessage) {
                    return `${prefix} ${e.content.body} eventId: ${e.eventId} isLocalPending: ${
                        e.isLocalPending ? 'true' : 'false'
                    }`
                }
                return `${prefix} ${e.fallbackContent} eventId: ${e.eventId}`
            }, [])
            return (
                <>
                    <RegisterAndJoinSpace
                        spaceId={janesSpaceId}
                        channelId={janesChannelId}
                        signer={signer}
                    />
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
            <TownsTestApp provider={bobProvider}>
                <SpaceContextProvider spaceId={janesSpaceId}>
                    <ChannelContextProvider channelId={janesChannelId!}>
                        <TestRoomMessages signer={bobProvider.wallet} />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </TownsTestApp>,
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
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // wait for the channel join
        await waitFor(
            () => expect(channelMembership).toHaveTextContent(Membership.Join),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // wait for jane to see bob as member
        await waitFor(
            () =>
                expect(
                    jane.casablancaClient
                        ?.stream(janesChannelId)
                        ?.view.getMembers()
                        .isMemberJoined(bobProvider.userId),
                ).toBe(true),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // have jane send a message to bob
        await act(async () => {
            await jane.sendMessage(janesChannelId, 'hello bob')
        })
        // expect our message to show
        await waitFor(
            () => expect(message0).toHaveTextContent('hello bob'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // and for a block confirmation
        await waitFor(() => expect(message0).not.toHaveTextContent('✅:??'))
        // have bob send a message to jane
        fireEvent.click(sendMessageButton)

        // wait for the event to be sent
        await waitFor(() => expect(msgSent).toHaveTextContent('message sent'))

        // expect it to render as well
        await waitFor(() => expect(message1).toHaveTextContent('hello jane'))
        // expect jane to recieve the message
        await waitFor(() => expect(jane.getMessages(janesChannelId)).toContain('hello jane'))
        // expect the message to "flush" out of local pending state
        await waitFor(() => expect(message1).not.toHaveTextContent('isLocalPending: true'))
        // expect it to get confirmed
        await waitFor(() => expect(message0).not.toHaveTextContent('✅:??'))
        // edit the event
        fireEvent.click(editButton)
        // wait for the event to be edited
        await waitFor(() => expect(msgEdited).toHaveTextContent('message edited'))
        await waitFor(() => expect(message1).toHaveTextContent('hello jane gm!'))
        // expect jane to see the edited event
        await waitFor(() => expect(jane.getMessages(janesChannelId)).toContain('hello jane gm!'))
        // redact the event
        fireEvent.click(redactButton)
        // exect the message to be empty
        await waitFor(() => expect(message1).toHaveTextContent(ZTEvent.RedactionActionEvent))
    })
})
