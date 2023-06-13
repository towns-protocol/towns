/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group dendrite
 */
import { Membership, RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
    waitForJoiningChannelImmediatelyAfterCreation,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { LoginWithWallet } from './helpers/TestComponents'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('messageScrollbackHooks', () => {
    // TODO: https://linear.app/hnt-labs/issue/HNT-1611/messagescrollbackhookstesttsx
    test.skip('user can join a room, see messages, and send messages', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a spaceß
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobs space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier
        //
        await alice.joinRoom(spaceId)
        await waitForJoiningChannelImmediatelyAfterCreation(() => alice.joinRoom(channelId))
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }
        // stop alice
        await alice.logout()
        // create a veiw for alice
        const TestComponent = () => {
            const { scrollback } = useZionClient()
            const { timeline } = useChannelTimeline()
            const mySpaceMembership = useMyMembership(spaceId)
            const onClickScrollback = useCallback(() => {
                void scrollback(channelId, 30)
            }, [scrollback])
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="spaceMembership"> {mySpaceMembership} </div>
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
            <ZionTestApp provider={alice.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const spaceMembership = screen.getByTestId('spaceMembership')
        const messageslength = screen.getByTestId('messageslength')
        const scrollbackButton = screen.getByRole('button', {
            name: 'Scrollback',
        })
        // wait for the channel join
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join))
        // expect our message to show
        await waitFor(() => expect(messageslength).toHaveTextContent('20'))
        // have bob send a message to jane
        fireEvent.click(scrollbackButton)
        // expect it to render as well
        await waitFor(() => expect(messageslength).toHaveTextContent('34'))
    })
})
