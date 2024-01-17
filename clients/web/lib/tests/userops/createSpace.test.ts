import { Permission } from '@river/web3'
import { TestConstants } from '../integration/helpers/TestConstants'
import { registerAndStartClient } from '../integration/helpers/TestUtils'
import { createUngatedSpace, getAccountAbstractionConfig } from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

test('can create a space via userop and pass entitlement check to become member', async () => {
    const alice = await registerAndStartClient('alice', TestConstants.getUnfundedWallet(), {
        accountAbstractionConfig,
    })

    // send a user op that creates a space and links AA wallet so entitlement passes
    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])

    expect(alice.getRoomMember(spaceId!, alice.getUserId()!)).toBeTruthy()
})
