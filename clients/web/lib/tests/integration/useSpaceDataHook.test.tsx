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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LoginStatus } from '../../src/hooks/login'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { Permission } from '@river/web3'
import React, { useCallback, useEffect } from 'react'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { LoginWithWallet } from './helpers/TestComponents'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { sleep } from '../../src/utils/zion-utils'

describe('useSpaceDataHook', () => {
    test('a user that joins an existing space should get space info from useSpaceData', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            {
                name: makeUniqueName('bobs space'),
            },
        )) as RoomIdentifier
        // and a channel
        await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        // going to use alice in react component
        await alice.stopClients()

        const LoginAndJoin = () => {
            const { client } = useZionClient()
            const profile = useMyProfile()

            const onJoinClick = useCallback(async () => {
                if (!client) {
                    throw new Error('aw shucks, no client')
                }
                await client.joinTown(spaceId, alice.wallet)
            }, [client])
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="userIdContent">{profile?.userId}</div>
                    <button
                        onClick={() => {
                            void onJoinClick()
                        }}
                    >
                        Join room button
                    </button>
                </>
            )
        }

        const SpaceData = () => {
            const space = useSpaceData()
            const [membershipTypesSeen, setMembershipTypesSeen] = React.useState<string[]>([])

            useEffect(() => {
                if (space) {
                    setMembershipTypesSeen((prev) => [...prev, space.membership])
                }
            }, [space])
            return (
                <>
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

                    <div>
                        Sequence of membership types seen:
                        {JSON.stringify(membershipTypesSeen)}
                    </div>
                    <div data-testid={'spaceMembership'}>{space?.membership}</div>
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={alice.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <LoginAndJoin />
                        <SpaceData />
                    </>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // gather our test elements
        const loginStatus = screen.getByTestId('loginStatus')
        const clientRunning = screen.getByTestId('clientRunning')
        const joinButton = screen.getByText('Join room button')
        const spaceMembership = screen.getByTestId('spaceMembership')
        const userIdContent = screen.getByTestId('userIdContent')

        // wait for registration
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // sanity check, we need to be logged in as alice
        await waitFor(() => expect(userIdContent).toHaveTextContent(alice.getUserId() ?? ''))
        // extra sanity check, need client running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))

        fireEvent.click(joinButton)
        await waitFor(() => expect(spaceMembership).toHaveTextContent('join'), { timeout: 10000 })
        await sleep(1000)
        await waitFor(() => expect(spaceMembership).toHaveTextContent('join'))
    })
})
