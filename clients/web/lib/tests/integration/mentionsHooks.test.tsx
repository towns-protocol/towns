/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group dendrite
 */
import { RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { LoginWithWallet } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useChannelNotificationCounts } from '../../src/hooks/use-channel-notification-counts'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'

describe('mentionsHooks', () => {
    test('user can see mentions, and can see mentions after login', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        const aliceUserId = alice.auth?.userId
        if (!aliceUserId) {
            throw new Error('aliceUserId is undefined')
        }
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()
        // alice join space and channel
        await alice.joinRoom(spaceId)
        await alice.joinRoom(channelId)
        // logout alice
        await alice.logout()
        // bob send a message to alice
        await bob.sendMessage(channelId, 'hello world')
        await bob.sendMessage(channelId, 'hello alice', {
            mentions: [{ displayName: alice.name, userId: aliceUserId }],
        })

        // create a veiw for alice
        const TestComponent = () => {
            const channelNotis = useChannelNotificationCounts(channelId)
            const { timeline } = useChannelTimeline()
            const marker = useFullyReadMarker(channelId)
            const { sendReadReceipt } = useZionClient()
            const onClickMarkAsRead = useCallback(() => {
                if (marker) {
                    void sendReadReceipt(marker)
                }
            }, [marker, sendReadReceipt])
            return (
                <>
                    <LoginWithWallet />
                    <button onClick={onClickMarkAsRead}>markAsRead</button>
                    <div data-testid="notificationCounts">
                        mentions:{channelNotis.mentions.toString()}
                        isUnread:{channelNotis.isUnread.toString()}
                    </div>
                    <div data-testid="marker">{JSON.stringify(marker, null, 2)}</div>
                    <div id="allMessages">
                        {timeline.map((event) => event.fallbackContent).join('\n')}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={alice.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const notificationCounts = screen.getByTestId('notificationCounts')
        const markAsReadButton = screen.getByRole('button', {
            name: 'markAsRead',
        })
        // wait for the channel join
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // expect our message to show
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:true'))
        await waitFor(() => expect(notificationCounts).toHaveTextContent('mentions:1'))
        // send another mention to make sure it updates
        await bob.sendMessage(channelId, 'this is important @alice', {
            mentions: [{ displayName: alice.name, userId: aliceUserId }],
        })
        // expect it to render as well
        await waitFor(() => expect(notificationCounts).toHaveTextContent('mentions:2'))
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:true'))
        // have bob send a message to jane
        fireEvent.click(markAsReadButton)
        // expect it to render as well
        await waitFor(() => expect(notificationCounts).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:false'))
    })
})
