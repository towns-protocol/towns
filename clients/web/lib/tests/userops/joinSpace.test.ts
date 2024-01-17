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

test('can join a space via userop and pass entitlement check to become a member', async () => {
    const alice = await registerAndStartClient('alice', TestConstants.getUnfundedWallet(), {
        accountAbstractionConfig,
    })

    const bob = await registerAndStartClient('alice', TestConstants.getUnfundedWallet(), {
        accountAbstractionConfig,
    })

    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])

    expect(alice.getRoomMember(spaceId!, alice.getUserId()!)).toBeTruthy()

    const room = await bob.joinTown(spaceId!, bob.wallet)
    expect(room.members.map((m) => m.userId).includes(bob.getUserId()!)).toBeTruthy()
})
