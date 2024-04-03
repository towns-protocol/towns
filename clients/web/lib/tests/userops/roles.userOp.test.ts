import { NoopRuleData, Permission } from '@river-build/web3'
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
const ROLE_NAME = 'role_name'
const NEW_ROLE_NAME = 'new_role_name'

test('can create, update, and delete a role with user ops', async () => {
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

    expect(spaceId).toBeDefined()

    // create role
    const roleId = await alice.createRole(
        spaceId!,
        ROLE_NAME,
        // permissions
        [],
        // users
        [],
        // tokens
        NoopRuleData,
    )

    expect(roleId).toBeDefined()
    const role = await alice.spaceDapp.getRole(spaceId!, roleId!.roleId)
    expect(role?.name).toBe(ROLE_NAME)
    expect(role?.permissions).toHaveLength(0)

    // update role
    const txContext = await alice.updateRoleTransaction(
        spaceId!,
        roleId!.roleId,
        NEW_ROLE_NAME,
        // permissions
        [Permission.Read, Permission.Write],
        // users
        [],
        // tokens
        NoopRuleData,
        alice.provider.wallet,
    )

    await alice.waitForUpdateRoleTransaction(txContext)
    const updatedRole = await alice.spaceDapp.getRole(spaceId!, roleId!.roleId)
    expect(updatedRole?.name).toBe(NEW_ROLE_NAME)
    expect(updatedRole?.permissions).toHaveLength(2)

    // delete role
    const deleteTxContext = await alice.deleteRoleTransaction(
        spaceId!,
        roleId!.roleId,
        alice.provider.wallet,
    )
    await alice.waitForDeleteRoleTransaction(deleteTxContext)
    const deletedRole = await alice.spaceDapp.getRole(spaceId!, roleId!.roleId)
    expect(deletedRole).toBeNull()
})
