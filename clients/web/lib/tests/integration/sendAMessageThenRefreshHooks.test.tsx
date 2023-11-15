import { Permission } from '@river/web3'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { useChannelId } from '../../src/hooks/use-channel-id'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import { useCallback, useMemo } from 'react'
import { LoginWithWallet } from './helpers/TestComponents'
import { ZionTestApp } from './helpers/ZionTestApp'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { TestConstants } from './helpers/TestConstants'
import { Membership } from '../../src/types/zion-types'
import { useMyMembership } from '../../src/hooks/use-my-membership'

describe('sendAMessageThenRefresh.hooks', () => {
    // test that when loading a user that is participating in a channel, the existing channel messages decrypt and render properly
    test('a user decrypts their own messages after refreshing', async () => {
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
        )) as RoomIdentifier
        // create a space
        //
        let janesChannelId: RoomIdentifier | undefined
        if (janesSpaceId) {
            janesChannelId = (await createTestChannelWithSpaceRoles(jane, {
                name: 'janes channel',
                parentSpaceId: janesSpaceId,
                roleIds: [],
            })) as RoomIdentifier
        }
        if (!janesChannelId) {
            throw new Error('janesChannelId not defined')
        }
        await jane.sendMessage(janesChannelId, 'Hello World')
        await jane.sendMessage(janesChannelId, 'Im a teapot')

        const janesProvider = jane.provider
        await jane.logout()
        // create a veiw for bob
        const TestRoomMessages = () => {
            const channelId = useChannelId()
            const myChannelMembership = useMyMembership(channelId)
            const { timeline } = useChannelTimeline()

            const messages = useMemo(
                () => timeline.filter((x) => x.content?.kind === ZTEvent.RoomMessage),
                [timeline],
            )
            // send message

            // format for easy reading
            const formatMessage = useCallback((e: TimelineEvent) => {
                if (e.content?.kind === ZTEvent.RoomMessage) {
                    return `${e.content.body} eventId: ${e.eventId} isLocalPending: ${
                        e.isLocalPending ? 'true' : 'false'
                    }`
                }
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }, [])
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="channelId">{channelId.networkId}</div>
                    <div data-testid="channelMembership">{myChannelMembership}</div>
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
            <ZionTestApp provider={janesProvider}>
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
        // expect it to render as well
        await waitFor(() => expect(message0).toHaveTextContent('Hello World'))
        // expect the message to "flush" out of local pending state
        await waitFor(() => expect(message1).toHaveTextContent('Im a teapot'))
    })
})
