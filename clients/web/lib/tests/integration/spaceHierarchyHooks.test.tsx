/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownsNfts,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'
import { render, screen, waitFor } from '@testing-library/react'

import { AuthStatus } from '../../src/hooks/login'
import { Permission } from '@river-build/web3'
import React from 'react'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { TownsTestApp } from './helpers/TownsTestApp'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { LoginWithWallet } from './helpers/TestComponents'
import { TSigner } from '../../src/types/web3-types'

// TODO: https://linear.app/hnt-labs/issue/HNT-1587/testsintegrationspacehierarchyhookstesttsx
describe('spaceHierarchyHooks', () => {
    test('create a space with two users, have alice create a child channel, ensure bob sees it', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient(
            'alice',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = await createTestSpaceGatedByTownsNfts(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            {
                name: makeUniqueName('bobs space'),
            },
        )
        // and a channel
        await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })
        // set the space child prop on the room to 0 so that anyone can make channels
        // stop bob, we'll be using him in the react component
        await bob.stopClients()
        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        // create a power levels view for bob
        const SpaceChannelsContent = ({ signer }: { signer: TSigner }) => {
            const space = useSpaceData()
            // content
            return (
                <>
                    <LoginWithWallet signer={signer} />
                    <div data-testid="spaceId">{space?.id}</div>
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
            <TownsTestApp provider={bob.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <SpaceChannelsContent signer={bob.provider.wallet} />
                </SpaceContextProvider>
            </TownsTestApp>,
        )
        // gather our test elements
        const authStatus = screen.getByTestId('authStatus')
        const spaceChildCount = screen.getByTestId('spaceChildCount')
        // wait for registration
        await waitFor(() => expect(authStatus).toHaveTextContent(AuthStatus.ConnectedToRiver))
        // expect the initial space child count to include the channel bob created and the default channel
        await waitFor(
            () => expect(spaceChildCount).toHaveTextContent('2'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // have alice create a channel
        await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })
        await waitFor(
            async () => expect((await alice.spaceDapp.getChannels(spaceId)).length).toBe(3),
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
