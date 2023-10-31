/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownAndZionNfts,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'
import { render, screen, waitFor } from '@testing-library/react'

import { LoginStatus } from '../../src/hooks/login'
import { Permission } from '@river/web3'
import React from 'react'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { LoginWithWallet } from './helpers/TestComponents'

// TODO: https://linear.app/hnt-labs/issue/HNT-1587/testsintegrationspacehierarchyhookstesttsx
describe('spaceHierarchyHooks', () => {
    test('create a space with two users, have alice create a child channel, ensure bob sees it', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            {
                name: makeUniqueName('bobs space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // and a channel
        await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })
        // set the space child prop on the room to 0 so that anyone can make channels
        // stop bob, we'll be using him in the react component
        await bob.stopClients()
        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        // create a power levels view for bob
        const SpaceChannelsContent = () => {
            const space = useSpaceData()
            // content
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="spaceId">{space?.id.networkId}</div>
                    <div>
                        <div>SPACE INFO:</div>
                        {JSON.stringify(
                            {
                                space,
                            },
                            null,
                            2,
                        )}
                    </div>
                    <div data-testid="spaceChildCount">
                        {space?.channelGroups && space?.channelGroups?.length > 0
                            ? space?.channelGroups[0].channels.length.toString()
                            : 'undefined'}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={bob.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <SpaceChannelsContent />
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // gather our test elements
        const loginStatus = screen.getByTestId('loginStatus')
        const spaceChildCount = screen.getByTestId('spaceChildCount')
        // wait for registration
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // expect the initial space child count to include the channel bob created and the default channel
        await waitFor(
            () => expect(spaceChildCount).toHaveTextContent('2'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // have alice create a channel
        await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })
        await waitFor(
            async () =>
                expect((await alice.spaceDapp.getChannels(spaceId.networkId)).length).toBe(3),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // wait for the space child count to change
        screen.debug(undefined, Infinity)
        await waitFor(
            () => expect(spaceChildCount).toHaveTextContent('3'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    })
})
