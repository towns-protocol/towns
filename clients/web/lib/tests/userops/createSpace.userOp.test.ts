import { Permission } from '@river-build/web3'
import { registerAndStartClient, waitForWithRetries } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    getAccountAbstractionConfig,
    generateRandomUnfundedOrPrivateKeyWallet,
    isSmartAccountDeployed,
} from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

test('can create a space via userop and pass entitlement check to become member', async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )

    // send a user op that creates a space and links AA wallet so entitlement passes
    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])
    await waitForWithRetries(() => isSmartAccountDeployed(alice))

    expect(alice.getRoomMember(spaceId!, alice.getUserId())).toBeTruthy()
})
