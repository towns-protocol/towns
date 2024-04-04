import { Permission } from '@river-build/web3'
import { registerAndStartClient, waitForWithRetries } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    generateRandomUnfundedOrPrivateKeyWallet,
    getAccountAbstractionConfig,
    isSmartAccountDeployed,
    sleepBetweenTxs,
} from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

test('can ban a user from a space via userop', async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )

    const bob = await registerAndStartClient(
        'bob',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_2),
        {
            accountAbstractionConfig,
        },
    )

    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])
    await waitForWithRetries(() => isSmartAccountDeployed(alice))
    await sleepBetweenTxs()

    expect(alice.getRoomMember(spaceId!, alice.getUserId()!)).toBeTruthy()

    const room = await bob.joinTown(spaceId!, bob.wallet)
    await waitForWithRetries(() => isSmartAccountDeployed(bob))
    await sleepBetweenTxs()

    expect(room.members.map((m) => m.userId).includes(bob.getUserId()!)).toBeTruthy()

    const banTransaction = await alice.banTransaction(spaceId!, bob.getUserId()!, alice.wallet)
    await alice.waitForBanUnbanTransaction(banTransaction)
    await sleepBetweenTxs()

    const isBanned = await alice.walletAddressIsBanned(spaceId!, bob.getUserId()!)
    expect(isBanned).toBe(true)

    const unbanTransaction = await alice.unbanTransaction(spaceId!, bob.getUserId()!, alice.wallet)
    await alice.waitForBanUnbanTransaction(unbanTransaction)

    const isBannedAfterUnban = await alice.walletAddressIsBanned(spaceId!, bob.getUserId()!)
    expect(isBannedAfterUnban).toBe(false)
})
