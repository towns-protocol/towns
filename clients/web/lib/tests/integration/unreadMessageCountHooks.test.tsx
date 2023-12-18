/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import { Membership } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import { TimelineEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { RegisterWallet } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useZionContext } from '../../src/components/ZionContextProvider'
import { TSigner } from '../../src/types/web3-types'

describe('unreadMessageCountHooks', () => {
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // bob needs funds to mint membership
        await bobProvider.fundWallet()
        // jane needs funds to create a space
        await jane.fundWallet()
        // create a space
        const janesSpaceId = (await createTestSpaceGatedByTownNft(jane, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        //
        const janesChannelId = (await createTestChannelWithSpaceRoles(jane, {
            name: 'janes channel',
            parentSpaceId: janesSpaceId,
            roleIds: [],
        })) as RoomIdentifier
        // send 20 messages to the space after we make the channel
        // dendrite doesn't natively send space child events with state
        // if they are too far back we don't know if this room has children
        for (let i = 0; i < 20; i++) {
            await jane.sendMessage(janesChannelId, 'hi ' + i.toString())
        }

        // create a veiw for bob
        const TestComponent = ({ signer }: { signer: TSigner }) => {
            const { joinRoom, joinTown, sendMessage, sendReadReceipt } = useZionClient()
            const { spaceUnreads, spaceUnreadChannelIds } = useZionContext()
            const spaceFullyReadmarker = useFullyReadMarker(janesSpaceId)
            const channelFullyReadMarker = useFullyReadMarker(janesChannelId)
            const spaceHasUnread = spaceUnreads[janesSpaceId.streamId]
            const mySpaceMembership = useMyMembership(janesSpaceId)
            const myChannelMembership = useMyMembership(janesChannelId)
            const { timeline } = useChannelTimeline()
            const messages = timeline.filter((x) => x.content?.kind === ZTEvent.RoomMessage)
            // handle join
            const onClickJoinSpace = useCallback(() => {
                void joinTown(janesSpaceId, bobProvider.wallet)
            }, [joinTown])
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
                if (spaceFullyReadmarker?.isUnread === true) {
                    // this one is pretty weird, seems like every 10th run the server laggs
                    // and we receive a few space messages after we join the channel
                    // and end up with some space unread counts
                    void sendReadReceipt(spaceFullyReadmarker)
                }
                if (channelFullyReadMarker?.isUnread === true) {
                    void sendReadReceipt(channelFullyReadMarker)
                }
            }, [channelFullyReadMarker, sendReadReceipt, spaceFullyReadmarker])
            // format for easy reading
            function formatMessage(e: TimelineEvent) {
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }

            const listOfChannelsWithUnreads = spaceUnreadChannelIds[janesSpaceId.streamId]

            return (
                <>
                    <RegisterWallet signer={signer} />
                    <div data-testid="spaceMembership"> {mySpaceMembership} </div>
                    <div data-testid="channelMembership"> {myChannelMembership} </div>
                    <button onClick={onClickJoinSpace}>join space</button>
                    <button onClick={onClickJoinChannel}>join channel</button>
                    <button onClick={onMarkAsRead}>mark as read</button>
                    <button onClick={onClickSendMessage}>Send Message</button>
                    <div data-testid="spaceFullyReadMarker">
                        {JSON.stringify(spaceFullyReadmarker)}
                    </div>
                    <div data-testid="spaceUnreadChannelIds">
                        {listOfChannelsWithUnreads &&
                            Array.from(listOfChannelsWithUnreads).map((id) => (
                                <div key={id}>{id}</div>
                            ))}
                    </div>
                    <div data-testid="spaceHasUnread">
                        {spaceHasUnread === undefined ? 'undefined' : spaceHasUnread.toString()}
                    </div>
                    <div data-testid="channelFullyReadMarker">
                        {channelFullyReadMarker === undefined
                            ? 'undefined'
                            : `isUnread:${channelFullyReadMarker.isUnread.toString()} eventId:${
                                  channelFullyReadMarker.eventId
                              }`}
                    </div>
                    <div data-testid="lastMessage">
                        {messages.length > 0 ? formatMessage(messages.at(-1)!) : 'empty'}
                    </div>
                    <div data-testid="allMessages">
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
                        <TestComponent signer={bobProvider.wallet} />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )

        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const spaceMembership = screen.getByTestId('spaceMembership')
        const channelMembership = screen.getByTestId('channelMembership')
        const lastMessage = screen.getByTestId('lastMessage')
        const allMessages = screen.getByTestId('allMessages')
        const spaceHasUnread = screen.getByTestId('spaceHasUnread')
        const channelFullyReadMarker = screen.getByTestId('channelFullyReadMarker')
        const spaceUnreadChannelIds = screen.getByTestId('spaceUnreadChannelIds')
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
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join))
        // check assumptions
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('undefined'))
        // check the count (9/28/2022 dendrite doesn't send notifications for invites)
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('undefined'))
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
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(spaceUnreadChannelIds.children.length).toBe(1))
        // mark as read
        fireEvent.click(markAsReadButton)
        // check count
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(spaceUnreadChannelIds.children.length).toBe(0))
        // have jane send a message to bob
        await jane.sendMessage(janesChannelId, "it's Jane!")
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(spaceUnreadChannelIds.children.length).toBe(1))
        // send another message
        await jane.sendMessage(janesChannelId, 'rember me!')
        // sending a message doesn't reset the count
        fireEvent.click(sendMessageButton)
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('true'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(allMessages).toHaveTextContent('rember me!'))
        await waitFor(() => expect(spaceUnreadChannelIds.children.length).toBe(1))
        // send a message back
        fireEvent.click(markAsReadButton)
        // check count
        await waitFor(() => expect(spaceHasUnread).toHaveTextContent('false'))
        await waitFor(() => expect(channelFullyReadMarker).toHaveTextContent('isUnread:false'))
        await waitFor(() => expect(spaceUnreadChannelIds.children.length).toBe(0))
        // have jane create a new room and invite bob
        const newRoomId = await jane.createChannel(
            {
                name: 'janes channel',
                parentSpaceId: janesSpaceId,
                roleIds: [],
            },
            jane.provider.wallet,
        )
        if (!newRoomId) {
            throw new Error('new room id is undefined')
        }
    })
})
