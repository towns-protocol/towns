import {
    EntitlementModuleType,
    Permission,
    EntitlementStruct,
    Address,
    MembershipStruct,
    LegacyMembershipStruct,
} from './ContractTypes'
import {
    createRuleEntitlementStruct,
    createRuleEntitlementV2Struct,
    createUserEntitlementStruct,
    convertRuleDataV2ToV1,
} from './ConvertersEntitlements'
import { decodeRuleDataV2 } from './entitlement'
import { Hex } from 'viem'

import { Space as SpaceV3 } from './v3/Space'
import { IRuleEntitlementBase, IRuleEntitlementV2Base } from './v3'

export async function createLegacyEntitlementStruct<Space extends SpaceV3>(
    spaceIn: Space,
    users: string[],
    ruleData: IRuleEntitlementBase.RuleDataStruct,
): Promise<EntitlementStruct[]> {
    const space = spaceIn as SpaceV3
    // figure out the addresses for each entitlement module
    const entitlementModules = await space.Entitlements.read.getEntitlements()
    let userEntitlementAddress
    let ruleEntitlementAddress
    for (const module of entitlementModules) {
        switch (module.moduleType as EntitlementModuleType) {
            case EntitlementModuleType.UserEntitlement:
                userEntitlementAddress = module.moduleAddress
                break
            case EntitlementModuleType.RuleEntitlement:
                ruleEntitlementAddress = module.moduleAddress
                break
        }
    }
    if (!userEntitlementAddress) {
        throw new Error('User entitlement module address not found.')
    }
    if (!ruleEntitlementAddress) {
        throw new Error('Rule entitlement module address not found.')
    }

    // create the entitlements array
    const entitlements: EntitlementStruct[] = []
    // create the user entitlement
    if (users.length) {
        const userEntitlement: EntitlementStruct = createUserEntitlementStruct(
            userEntitlementAddress,
            users,
        )
        entitlements.push(userEntitlement)
    }

    if (ruleData.operations.length > 0) {
        const ruleEntitlement: EntitlementStruct = createRuleEntitlementStruct(
            ruleEntitlementAddress as `0x{string}`,
            ruleData,
        )
        entitlements.push(ruleEntitlement)
    }
    // return the converted entitlements
    return entitlements
}

export async function createEntitlementStruct<Space extends SpaceV3>(
    spaceIn: Space,
    users: string[],
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): Promise<EntitlementStruct[]> {
    const space = spaceIn as SpaceV3
    // figure out the addresses for each entitlement module
    const entitlementModules = await space.Entitlements.read.getEntitlements()
    let userEntitlementAddress
    let ruleEntitlementAddress
    for (const module of entitlementModules) {
        switch (module.moduleType as EntitlementModuleType) {
            case EntitlementModuleType.UserEntitlement:
                userEntitlementAddress = module.moduleAddress
                break
            case EntitlementModuleType.RuleEntitlementV2:
                ruleEntitlementAddress = module.moduleAddress
                break
        }
    }
    if (!userEntitlementAddress) {
        throw new Error('User entitlement module address not found.')
    }
    if (!ruleEntitlementAddress) {
        throw new Error('Rule entitlement V2 module address not found.')
    }

    // create the entitlements array
    const entitlements: EntitlementStruct[] = []
    // create the user entitlement
    if (users.length) {
        const userEntitlement: EntitlementStruct = createUserEntitlementStruct(
            userEntitlementAddress,
            users,
        )
        entitlements.push(userEntitlement)
    }

    if (ruleData.operations.length > 0) {
        const ruleEntitlement: EntitlementStruct = createRuleEntitlementV2Struct(
            ruleEntitlementAddress as Address,
            ruleData,
        )
        entitlements.push(ruleEntitlement)
    }
    // return the converted entitlements
    return entitlements
}

export function toPermissions(permissions: readonly string[]): Permission[] {
    return permissions.map((p) => {
        const perm = p as Permission
        return perm
    })
}

export function downgradeMembershipStruct(membership: MembershipStruct): LegacyMembershipStruct {
    return {
        requirements: {
            ruleData: convertRuleDataV2ToV1(
                decodeRuleDataV2(membership.requirements.ruleData as Hex),
            ),
            everyone: membership.requirements.everyone,
            users: membership.requirements.users,
            syncEntitlements: membership.requirements.syncEntitlements,
        },
        permissions: membership.permissions,
        settings: membership.settings,
    }
}
