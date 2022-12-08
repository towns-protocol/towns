/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership, RoomVisibility } from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LoginWithWallet } from './helpers/TestComponents'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import React from 'react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useInvites } from '../../src/hooks/use-space-data'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useZionContext } from '../../src/components/ZionContextProvider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('userProfileOnAcceptInviteHooks', () => {
    jest.setTimeout(30000)
    /// when we accept an invite, matrix is sending us our own membership info without
    /// saturating it with the proper display name (avatar info seems correct).
    test('user sees own info after accepting an invite', async () => {
        // create clients
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // save off the wallet
        const aliceProvider = alice.provider
        // set display name and avatar
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('alice.p ng')
        // stop alice
        alice.stopClient()
        // create a veiw for alice
        const TestUserProfileOnAcceptInvite = () => {
            const myProfile = useMyProfile()
            const { spaces } = useZionContext()
            const { joinRoom } = useZionClient()
            const invites = useInvites()
            const roomId = invites[0]?.id ?? spaces[0]?.id
            const myMembership = useMyMembership(roomId)
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="myProfileName">{myProfile?.displayName ?? 'unknown'}</div>
                    <div data-testid="invitesCount">
                        {invites.length > 0 ? invites.length.toString() : 'none'}
                    </div>
                    <div data-testid="roomId">{roomId?.matrixRoomId ?? 'none'}</div>
                    <div data-testid="myMembership">{myMembership}</div>
                    <button onClick={() => void joinRoom(roomId)}>Accept Invite</button>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={aliceProvider}>
                <TestUserProfileOnAcceptInvite />
            </ZionTestApp>,
        )
        // get our test elements
        const myProfileName = screen.getByTestId('myProfileName')
        const myMembership = screen.getByTestId('myMembership')
        const invitesCount = screen.getByTestId('invitesCount')
        const acceptButton = screen.getByRole('button', { name: 'Accept Invite' })
        // verify alice name is rendering
        await waitFor(() => expect(myProfileName).toHaveTextContent("Alice's your aunt"))
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.matrixUserId!)
        // wait for the invite to show (this will transition back to 0 after the invite is accepted)
        await waitFor(() => expect(invitesCount).toHaveTextContent('1'))
        // click the accept button
        fireEvent.click(acceptButton)
        // wait for the room to be joined
        await waitFor(() => expect(myMembership).toHaveTextContent(Membership.Join))
        // verify alice name is rendering
        expect(myProfileName).toHaveTextContent("Alice's your aunt")
    }) // end test
}) // end describe
