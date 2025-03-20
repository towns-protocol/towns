import {
    Space,
    SpaceDapp,
    UpdateRoleParams,
    createLegacyEntitlementStruct,
    LegacyUpdateRoleParams,
} from '@towns-protocol/web3'
import { getFunctionSigHash } from './getFunctionSigHash'

export async function encodeUpdateRoleData({
    space,
    updateRoleParams,
    spaceDapp,
}: {
    space: Space
    updateRoleParams: UpdateRoleParams
    spaceDapp: SpaceDapp | undefined
}) {
    const functionName = 'updateRole'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }

    const updatedEntitlements = await spaceDapp.createUpdatedEntitlements(space, updateRoleParams)

    const callData = space.Roles.encodeFunctionData(functionName, [
        updateRoleParams.roleId,
        updateRoleParams.roleName,
        updateRoleParams.permissions,
        updatedEntitlements,
    ])

    return { functionHashForPaymasterProxy, callData }
}

export async function encodeLegacyUpdateRoleData(params: {
    space: Space
    legacyUpdateRoleParams: LegacyUpdateRoleParams
}) {
    const { space, legacyUpdateRoleParams } = params

    const functionName = 'updateRole'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const updatedEntitlements = await createLegacyEntitlementStruct(
        space,
        legacyUpdateRoleParams.users,
        legacyUpdateRoleParams.ruleData,
    )

    const callData = space.Roles.encodeFunctionData(functionName, [
        legacyUpdateRoleParams.roleId,
        legacyUpdateRoleParams.roleName,
        legacyUpdateRoleParams.permissions,
        updatedEntitlements,
    ])

    return { functionHashForPaymasterProxy, callData }
}
