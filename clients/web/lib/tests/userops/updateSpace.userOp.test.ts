import { Permission } from '@river-build/web3'
import { registerAndStartClient, waitForWithRetries } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    getAccountAbstractionConfig,
    generateRandomUnfundedOrPrivateKeyWallet,
    isSmartAccountDeployed,
    sleepBetweenTxs,
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
    await waitForWithRetries(() => isSmartAccountDeployed(alice))
    await sleepBetweenTxs()

    expect(spaceId).not.toBeUndefined()

    const town = alice.spaceDapp.getSpace(spaceId!)

    expect((await town?.getSpaceInfo())?.name).toBe(ogName)

    const userop = await alice.updateSpaceInfoTransaction(
        spaceId!,
        newName,
        'uri',
        'shortDescription',
        'longDescription',
        alice.wallet,
    )
    await alice.waitForUpdateSpaceInfoTransaction(userop)
    await sleepBetweenTxs()

    expect((await town?.getSpaceInfo())?.name).toBe(newName)
})
