/**
 * sendReactionHooks.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelId } from '../../src/hooks/use-channel-id'
import { useChannelReactions } from '../../src/hooks/use-channel-reactions'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { TestConstants } from './helpers/TestConstants'
import { TSigner } from '../../src/types/web3-types'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('sendReactionHooks', () => {
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // bob needs funds to mint
        await bobProvider.fundWallet()
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
        //
        const janesChannelId = (await createTestChannelWithSpaceRoles(jane, {
            name: 'janes channel',
            parentSpaceId: janesSpaceId,
            roleIds: [],
        })) as string
        // create a veiw for bob
        const TestRoomMessages = ({ signer }: { signer: TSigner }) => {
            const { sendReaction } = useZionClient()
            const channelId = useChannelId()
            const { timeline } = useChannelTimeline()
            const reactions = useChannelReactions()
            const messages = timeline.filter(
                (x) =>
                    x.content?.kind === ZTEvent.RoomMessage || x.content?.kind === ZTEvent.Reaction,
            )
            const onSendReaction = useCallback(() => {
                void sendReaction(channelId, messages[0].eventId, '👍')
            }, [channelId, messages, sendReaction])
            // todo redact reaction
            const formatMessage = useCallback(
                (e: TimelineEvent) => {
                    const reactionTxt = reactions[e.eventId]
                        ? ` reactions: (${Object.keys(reactions[e.eventId]).join(',')})`
                        : ''
                    return `${e.fallbackContent} eventId: ${e.eventId}` + reactionTxt
                },
                [reactions],
            )
            return (
                <>
                    <RegisterAndJoinSpace
                        spaceId={janesSpaceId}
                        channelId={janesChannelId}
                        signer={signer}
                    />
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
                        <TestRoomMessages signer={bobProvider.wallet} />
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
        const joinComplete = screen.getByTestId('joinComplete')

        // wait for client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        await waitFor(
            () => expect(joinComplete).toHaveTextContent('true'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // wait for the channel join
        await waitFor(() => expect(channelMembership).toHaveTextContent(Membership.Join))
        // have jane send a message to bob
        await jane.sendMessage(janesChannelId, 'hello bob')
        // expect our message to show
        await waitFor(() => expect(message0).toHaveTextContent('hello bob'))
        // have bob send a message to jane
        fireEvent.click(sendReactionButton)
        // expect it to render as well
        await waitFor(() => expect(message1).toHaveTextContent(ZTEvent.Reaction))
        // expect the reaction to show in the message
        await waitFor(() => expect(message0).toHaveTextContent('reactions: (👍)'))
        // expect jane to recieve the message
        await waitFor(
            () =>
                expect(jane.getEvents(janesChannelId).map((x) => x.content?.kind)).toContain(
                    ZTEvent.Reaction,
                ),
            TestConstants.DecaDefaultWaitForTimeout,
        )
    })
})
