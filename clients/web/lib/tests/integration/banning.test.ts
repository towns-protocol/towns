/**
 * @group core
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownsNfts,
} from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

test('create space, ban user, and check if banned', async () => {
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = (await createTestSpaceGatedByTownsNfts(bob, [
        Permission.Read,
        Permission.Write,
    ])) as string

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    const spaceStream = bob.casablancaClient?.streams.get(spaceId)
    expect(spaceStream).toBeDefined()
    await waitFor(() =>
        expect(spaceStream!.view.getMembers().isMemberJoined(alice.getUserId()!)).toBeTruthy(),
    )

    // Ensure that Alice is not banned
    const aliceIsBanned = await bob.walletAddressIsBanned(spaceId, alice.wallet.address)
    expect(aliceIsBanned).toBeFalsy()

    // Bob bans Alice
    const banTransaction = await bob.banTransaction(spaceId, alice.getUserId()!, bob.wallet)
    await bob.waitForBanUnbanTransaction(banTransaction)

    // Check if Alice is banned
    const aliceIsBannedAfterBan = await bob.walletAddressIsBanned(spaceId, alice.wallet.address)
    expect(aliceIsBannedAfterBan).toBeTruthy()

    // Remove Alice from space
    await bob.removeUser(spaceId, alice.getUserId()!)

    // Ensure that Alice is no longer in the space
    await waitFor(() =>
        expect(spaceStream!.view.getMembers().isMemberJoined(alice.getUserId()!)).toBeFalsy(),
    )

    // Bob unbans Alice
    const unbanTransaction = await bob.unbanTransaction(spaceId, alice.getUserId()!, bob.wallet)
    await bob.waitForBanUnbanTransaction(unbanTransaction)

    // Check that Alice is no longer banned
    const aliceIsBannedAfterUnban = await bob.walletAddressIsBanned(spaceId, alice.wallet.address)
    expect(aliceIsBannedAfterUnban).toBeFalsy()

    // Alice joins the space again
    await alice.joinTown(spaceId, alice.wallet)

    // Check that Alice is back in the space
    await waitFor(() =>
        expect(spaceStream!.view.getMembers().isMemberJoined(alice.getUserId()!)).toBeTruthy(),
    )
})
