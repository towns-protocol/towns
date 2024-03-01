/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river/web3'
import { LoginWithWallet } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useChannelNotificationCounts } from '../../src/hooks/use-channel-notification-counts'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useFullyReadMarker } from '../../src/hooks/use-fully-read-marker'
import { TestConstants } from './helpers/TestConstants'
import { TSigner } from '../../src/types/web3-types'

describe('mentionsHooks', () => {
    test('user can see mentions, and can see mentions after login', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])

        const aliceUserId = alice.getUserId()

        if (!aliceUserId) {
            throw new Error('aliceUserId is undefined')
        }
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])) as string
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()
        // alice join space and channel
        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channelId))
        // logout alice
        await alice.logout()

        // create a veiw for alice
        const TestComponent = ({ signer }: { signer: TSigner }) => {
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
                    <LoginWithWallet signer={signer} />
                    <button onClick={onClickMarkAsRead}>markAsRead</button>
                    <div data-testid="notificationCounts">
                        mentions:{channelNotis.mentions.toString()}
                        isUnread:{channelNotis.isUnread.toString()}
                    </div>
                    <div data-testid="marker">
                        {JSON.stringify(
                            marker,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                            (key, value) => (typeof value === 'bigint' ? value.toString() : value),
                            2,
                        )}
                    </div>
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
                        <TestComponent signer={alice.provider.wallet} />
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
        //
        // bob send a message to alice
        await act(() => {
            bob.sendMessage(channelId, 'hello world')
        })
        await act(() => {
            bob.sendMessage(channelId, 'hello alice', {
                mentions: [{ displayName: alice.name, userId: aliceUserId }],
            })
        })

        // expect our message to show
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:true'))
        await waitFor(
            () => expect(notificationCounts).toHaveTextContent('mentions:1'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // send another mention to make sure it updates
        await act(() => {
            bob.sendMessage(channelId, 'this is important @alice', {
                mentions: [{ displayName: alice.name, userId: aliceUserId }],
            })
        })
        // expect it to render as well
        await waitFor(() => expect(notificationCounts).toHaveTextContent('mentions:2'))
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:true'))
        // have bob send a message to jane
        await act(() => {
            fireEvent.click(markAsReadButton)
        })
        // expect it to render as well
        await waitFor(() => expect(notificationCounts).toHaveTextContent('mentions:0'))
        await waitFor(() => expect(notificationCounts).toHaveTextContent('isUnread:false'))
    })
})
