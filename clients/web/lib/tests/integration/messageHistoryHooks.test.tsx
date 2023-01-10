/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { Membership, RoomVisibility } from '../../src/types/matrix-types'
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
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('messageHistoryHooks', () => {
    test('user can join a room, see messages, and send messages', async () => {
        // create client
        // create alice provider
        const aliceProvider = new ZionTestWeb3Provider()
        const { bob } = await registerAndStartClients(['bob'])
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
        //
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }

        // create a veiw for alice
        const TestComponent = () => {
            const { scrollback } = useZionClient()
            const timeline = useChannelTimeline()
            const onClickScrollback = useCallback(() => {
                void scrollback(channelId, 30)
            }, [scrollback])
            return (
                <>
                    <RegisterAndJoinSpace spaceId={spaceId} channelId={channelId} />
                    <button onClick={onClickScrollback}>Scrollback</button>
                    <div data-testid="messageslength">
                        {timeline.length > 0 ? timeline.length.toString() : 'empty'}
                    </div>
                    <div id="allMessages">
                        {timeline.map((event) => event.fallbackContent).join('\n')}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={aliceProvider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const spaceMembership = screen.getByTestId('spaceMembership')
        const channelMembership = screen.getByTestId('spaceMembership')
        const messageslength = screen.getByTestId('messageslength')
        const scrollbackButton = screen.getByRole('button', {
            name: 'Scrollback',
        })
        // wait for the channel join
        await waitFor(
            () => expect(spaceMembership).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(channelMembership).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        // expect our message to show
        await waitFor(
            () => expect(messageslength).toHaveTextContent('20'),
            TestConstants.DefaultWaitForTimeout,
        )
        // have bob send a message to jane
        fireEvent.click(scrollbackButton)
        // expect it to render as well
        await waitFor(
            () => expect(messageslength).toHaveTextContent('34'),
            TestConstants.DefaultWaitForTimeout,
        )
    })
})
