import { Permission } from '@river/web3'
import { registerAndStartClient } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    getAccountAbstractionConfig,
    generateRandomUnfundedOrPrivateKeyWallet,
} from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

test('can update a space (name) via userop', async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )

    const ogName = 'test_space'
    const newName = 'new_name'

    // send a user op that creates a space and links AA wallet so entitlement passes
    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write], {
        name: ogName,
    })

    expect(spaceId).not.toBeUndefined()

    const town = alice.spaceDapp.getSpace(spaceId!)

    expect((await town?.getSpaceInfo())?.name).toBe(ogName)

    const userop = await alice.updateSpaceNameTransaction(spaceId!, newName, alice.wallet)
    await alice.waitForUpdateSpaceNameTransaction(userop)
    expect((await town?.getSpaceInfo())?.name).toBe(newName)
})
