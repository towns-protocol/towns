import {
    createEntitlementStruct,
    createLegacyEntitlementStruct,
    SpaceDapp,
} from '@towns-protocol/web3'
import { UserOps } from '../UserOperations'
import { getFunctionSigHash } from '../utils/getFunctionSigHash'

export async function createRole(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['createRole']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, roleName, permissions, users, ruleData, signer] = fnArgs

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const functionName = 'createRole'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const entitlements = await createEntitlementStruct(space, users, ruleData)

    const callData = space.Roles.encodeFunctionData(functionName, [
        roleName,
        permissions,
        entitlements,
    ])

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: spaceId,
        functionHashForPaymasterProxy,
    })
}

export async function legacyCreateRole(params: {
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
    fnArgs: Parameters<SpaceDapp['legacyCreateRole']>
}) {
    const { spaceDapp, sendUserOp, fnArgs } = params
    const [spaceId, roleName, permissions, users, ruleData, signer] = fnArgs

    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const space = spaceDapp.getSpace(spaceId)
    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const functionName = 'createRole'

    const functionHashForPaymasterProxy = getFunctionSigHash(space.Roles.interface, functionName)

    const entitlements = await createLegacyEntitlementStruct(space, users, ruleData)

    const callData = space.Roles.encodeFunctionData(functionName, [
        roleName,
        permissions,
        entitlements,
    ])

    return sendUserOp({
        toAddress: [space.Roles.address],
        callData: [callData],
        signer,
        spaceId: spaceId,
        functionHashForPaymasterProxy,
    })
}
