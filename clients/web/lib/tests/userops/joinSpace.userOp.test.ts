import { Permission } from '@river-build/web3'
import { registerAndStartClient, waitForWithRetries } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    generateRandomUnfundedOrPrivateKeyWallet,
    getAccountAbstractionConfig,
    isSmartAccountDeployed,
} from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

test('can join a space via userop and pass entitlement check to become a member', async () => {
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

    expect(alice.getRoomMember(spaceId!, alice.getUserId()!)).toBeTruthy()

    const room = await bob.joinTown(spaceId!, bob.wallet)
    await waitForWithRetries(() => isSmartAccountDeployed(bob))

    expect(room.members.map((m) => m.userId).includes(bob.getUserId()!)).toBeTruthy()
})
