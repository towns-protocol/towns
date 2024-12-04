/**
 * @group with-v2-entitlements
 */

import { createTownWithRequirements, updateRole } from '../testUtils'
import { NoopRuleData, UpdateRoleParams, Permission, EVERYONE_ADDRESS } from '@river-build/web3'

describe('updateRole', () => {
    test('user-gated space created with no-op ruleData allows updates on minter role', async () => {
        const { bobSpaceDapp, bobProvider, spaceId } = await createTownWithRequirements({
            everyone: false,
            users: ['alice'],
            ruleData: NoopRuleData,
        })

        // Update role to be ungated
        const { error } = await updateRole(
            bobSpaceDapp,
            bobProvider,
            {
                spaceNetworkId: spaceId,
                roleId: 1, // Minter role id
                roleName: 'Updated minter role',
                permissions: [Permission.JoinSpace],
                users: [EVERYONE_ADDRESS],
                ruleData: NoopRuleData,
            } as UpdateRoleParams,
            bobProvider.signer,
        )
        expect(error).toBeUndefined()
    })
})
