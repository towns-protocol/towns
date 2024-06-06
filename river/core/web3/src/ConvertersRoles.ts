import { EntitlementModuleType, Permission, EntitlementStruct } from './ContractTypes'
import { createRuleEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

import { Space as SpaceV3 } from './v3/Space'
import { IRuleEntitlement } from './v3'

export async function createEntitlementStruct<Space extends SpaceV3>(
    spaceIn: Space,
    users: string[],
    ruleData: IRuleEntitlement.RuleDataStruct,
): Promise<EntitlementStruct[]> {
    const space = spaceIn as SpaceV3
    // figure out the addresses for each entitlement module
    const entitlementModules = await space.Entitlements.read.getEntitlements()
    let userEntitlementAddress
    let ruleEntitlementAddress
    for (const module of entitlementModules) {
        switch (module.moduleType) {
            case EntitlementModuleType.UserEntitlement:
                userEntitlementAddress = module.moduleAddress
                break
            case EntitlementModuleType.RuleEntitlement:
                ruleEntitlementAddress = module.moduleAddress
                break
        }
    }
    if (!userEntitlementAddress) {
        throw new Error('User entitlement moodule address not found.')
    }
    if (!ruleEntitlementAddress) {
        throw new Error('Rule entitlement moodule address not found.')
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

export function toPermissions(permissions: readonly string[]): Permission[] {
    return permissions.map((p) => {
        const perm = p as Permission
        return perm
    })
}
