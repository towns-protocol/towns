/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership, RoomVisibility, SpaceItem } from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LoginWithWallet } from './helpers/TestComponents'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { useZionContext } from '../../src/components/ZionContextProvider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing
// https://linear.app/hnt-labs/issue/HNT-38/invites-might-not-sync-show-properly-in-some-instances
describe('inviteToSpace', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)

    test('user can receive an invite, display it, and accept it', async () => {
        // create clients
        const { jane, bob } = await registerAndStartClients(['jane', 'bob'])
        // create a wallet for bob
        const bobProvider = bob.provider
        const bobUserId = bob.matrixUserId!
        // create a space
        // jane needs funds to create a space
        await jane.fundWallet()
        const janes_space_1 = makeUniqueName('janes_space_1')
        const janesSpaceId_1 = (await createTestSpaceWithEveryoneRole(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: janes_space_1,
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier
        // create a second space
        const janes_space_2 = makeUniqueName('janes_space_2')
        const janesSpaceId_2 = (await createTestSpaceWithEveryoneRole(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: janes_space_2,
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier
        // and channel
        const janesChannelId_2 = (await createTestChannelWithSpaceRoles(jane, {
            name: 'janes_channel',
            visibility: RoomVisibility.Private,
            parentSpaceId: janesSpaceId_2,
            roleIds: [],
        })) as RoomIdentifier
        console.log('janes rooms', {
            janesSpaceId_1,
            janesSpaceId_2,
            janesChannelId_2,
        })
        // have bob logout
        await bob.logout()
        // send an invite to bob while he's logged out (regression)
        await jane.inviteUser(janesSpaceId_1, bobUserId)
        // create a veiw for bob
        const TestSpaceInvitesComponent = () => {
            const { joinRoom } = useZionClient()
            const { spaces, invitedToIds } = useZionContext()

            const myMembership1 = useMyMembership(janesSpaceId_1)
            const myMembership2 = useMyMembership(janesSpaceId_2)
            const myMembership3 = useMyMembership(janesChannelId_2)

            // accept the invites
            const onClickAcceptInvite1 = useCallback(() => {
                void joinRoom(janesSpaceId_1)
            }, [joinRoom])
            const onClickAcceptInvite2 = useCallback(() => {
                void joinRoom(janesSpaceId_2)
            }, [joinRoom])
            const onClickAcceptInvite3 = useCallback(() => {
                void joinRoom(janesChannelId_2)
            }, [joinRoom])
            // format for easy reading
            function formatSpace(s: SpaceItem) {
                return `${s.id.matrixRoomId}: ${s.name}`
            }
            return (
                <>
                    <LoginWithWallet />
                    <button onClick={onClickAcceptInvite1}>Accept Invite 1</button>
                    <button onClick={onClickAcceptInvite2}>Accept Invite 2</button>
                    <button onClick={onClickAcceptInvite3}>Accept Invite 3</button>
                    <div data-testid="allSpaces">
                        {spaces.map((space) => formatSpace(space)).join('\n')}
                    </div>
                    <div data-testid="allInvites">{invitedToIds.map((id) => id).join('\n')}</div>
                    <div data-testid="myMembership1">{myMembership1}</div>
                    <div data-testid="myMembership2">{myMembership2}</div>
                    <div data-testid="myMembership3">{myMembership3}</div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={bobProvider}>
                <TestSpaceInvitesComponent />
            </ZionTestApp>,
        )
        // get our test elements
        const myMembership1 = screen.getByTestId('myMembership1')
        const myMembership2 = screen.getByTestId('myMembership2')
        const myMembership3 = screen.getByTestId('myMembership3')
        const allSpaces = screen.getByTestId('allSpaces')
        const allInvites = screen.getByTestId('allInvites')
        const acceptInviteButton1 = screen.getByRole('button', {
            name: 'Accept Invite 1',
        })
        const acceptInviteButton2 = screen.getByRole('button', {
            name: 'Accept Invite 2',
        })
        const acceptInviteButton3 = screen.getByRole('button', {
            name: 'Accept Invite 3',
        })

        // wait the invite to show up
        await waitFor(
            () => expect(allInvites).toHaveTextContent(janesSpaceId_1.matrixRoomId),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(myMembership1).toHaveTextContent(Membership.Invite),
            TestConstants.DefaultWaitForTimeout,
        )

        // accept the invite
        fireEvent.click(acceptInviteButton1)

        // expect our sidebar to show the space
        await waitFor(
            () => expect(allSpaces).toHaveTextContent(janes_space_1),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(myMembership1).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )

        // have jane invite bob to the second space and channel
        await jane.inviteUser(janesSpaceId_2, bobUserId)
        await jane.inviteUser(janesChannelId_2, bobUserId)

        // wait for the invite to show up
        await waitFor(
            () => expect(allInvites).toHaveTextContent(janesSpaceId_2.matrixRoomId),
            TestConstants.DefaultWaitForTimeout,
        )
        // expect the space to still render
        await waitFor(
            () => expect(allSpaces).toHaveTextContent(janes_space_1),
            TestConstants.DefaultWaitForTimeout,
        )

        // accept the invites
        fireEvent.click(acceptInviteButton2)
        fireEvent.click(acceptInviteButton3)

        // wait for the space to show up
        await waitFor(
            () => expect(allSpaces).toHaveTextContent(janes_space_2),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(myMembership2).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(myMembership3).toHaveTextContent(Membership.Join),
            TestConstants.DefaultWaitForTimeout,
        )
        // expect the space to still render (regression)
        await waitFor(
            () => expect(allSpaces).toHaveTextContent(janes_space_1),
            TestConstants.DefaultWaitForTimeout,
        )

        // and the invite to go away
        await waitFor(
            () => expect(allInvites).toBeEmptyDOMElement(),
            TestConstants.DefaultWaitForTimeout,
        ) // regression, the channel invite was not removed
    })
})
