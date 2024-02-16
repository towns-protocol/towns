/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownAndZionNfts,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'
import { toSpaceHierarchy } from '../../src/hooks/ZionContext/useCasablancaSpaceHierarchies'

describe('spaceHierarchy', () => {
    // TODO: https://linear.app/hnt-labs/issue/HNT-1614/testsintegrationspacehierarchytestts
    test('create a public space and a public room, have user join space and search for space childs', async () => {
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
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])) as string

        // bob creates a room
        const roomId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string

        await waitFor(() => {
            const bob_spaceInfo = toSpaceHierarchy(bob.casablancaClient!, spaceId)
            expect(bob_spaceInfo?.channels.length).toEqual(2)
        })

        // alice joins the space
        await alice.joinTown(spaceId, alice.wallet)

        // alice syncs the space
        await waitFor(() => {
            const alice_spaceInfo = toSpaceHierarchy(alice.casablancaClient!, spaceId)
            expect(alice_spaceInfo?.channels.length).toEqual(2)
        })

        // can she join it?
        await waitForWithRetries(() => alice.joinRoom(roomId))
        const alice_roomInfo = alice.getRoomData(roomId)
        expect(alice_roomInfo?.id).toEqual(roomId)
    })
    test('create a private space and a public room, have user join space and search for space childs', async () => {
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
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobs space'),
            },
        )) as string

        // bob creates a room
        const roomId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string

        await waitFor(() => {
            const bob_spaceInfo = toSpaceHierarchy(bob.casablancaClient!, spaceId)
            expect(bob_spaceInfo?.channels.length).toEqual(2)
        })

        // alice syncs the space before getting an invite...
        expect(toSpaceHierarchy(alice.casablancaClient!, spaceId)?.channels).toStrictEqual([])

        // bob invites alice
        await bob.inviteUser(spaceId, alice.getUserId()!)

        // alice joins the space
        await alice.joinTown(spaceId, alice.wallet)

        // alice syncs the space
        await waitFor(() => {
            const alice_spaceInfo = toSpaceHierarchy(alice.casablancaClient!, spaceId)
            expect(alice_spaceInfo?.channels.length).toEqual(2)
        })

        // can she join it?
        await waitForWithRetries(() => alice.joinRoom(roomId))
        const alice_roomInfo = alice.getRoomData(roomId)
        expect(alice_roomInfo?.id).toEqual(roomId)
    })
})
