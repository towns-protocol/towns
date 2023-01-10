/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'
import { render, screen, waitFor } from '@testing-library/react'

import { LoginStatus } from '../../src/hooks/login'
import { Permission } from '../../src/client/web3/ContractTypes'
import React from 'react'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/matrix-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useEffect } from 'react'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { useZionClient } from '../../src/hooks/use-zion-client'

describe('spaceHierarchyHooks', () => {
    test('create a space with two users, have alice create a child channel, ensure bob sees it', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            [],
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
        await bob.setPowerLevel(spaceId, 'm.space.child', 0)
        // stop bob, we'll be using him in the react component
        await bob.stopClients()
        // alice joins the room
        await alice.joinRoom(spaceId)
        // create a power levels view for bob
        const SpaceChannelsContent = () => {
            const { loginStatus, loginError } = useMatrixStore()
            const { loginWithWallet } = useZionClient()
            const space = useSpaceData()
            // effect to log in
            useEffect(() => {
                void loginWithWallet('login...')
            }, [loginWithWallet])
            // content
            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="spaceId">{space?.id.networkId}</div>
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
        // expect the initial space child count to be 1
        await waitFor(() => expect(spaceChildCount).toHaveTextContent('1'))
        // have alice create a channel
        await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })
        // wait for the space child count to change
        await waitFor(() => expect(spaceChildCount).toHaveTextContent('2'), {
            timeout: 3000,
        })
    })
})
