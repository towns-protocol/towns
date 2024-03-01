import {
    EntitlementModuleType,
    Permission,
    EntitlementStruct,
    defaultVersion,
    Versions,
} from './ContractTypes'
import { createRuleEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

import { Town as TownV3 } from './v3/Town'
import { IRuleEntitlement } from './v3'

export async function createEntitlementStruct<Town extends TownV3>(
    townIn: Town,
    users: string[],
    ruleData: IRuleEntitlement.RuleDataStruct,
    version: Versions = defaultVersion,
): Promise<EntitlementStruct[]> {
    switch (version) {
        case 'v3': {
            const town = townIn as TownV3
            // figure out the addresses for each entitlement module
            const entitlementModules = await town.Entitlements.read.getEntitlements()
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

            if (ruleData) {
                const ruleEntitlement: EntitlementStruct = createRuleEntitlementStruct(
                    ruleEntitlementAddress as `0x{string}`,
                    ruleData,
                )
                entitlements.push(ruleEntitlement)
            }
            // return the converted entitlements
            return entitlements
        }

        default:
            throw new Error(`createEntitlementStruct(): not a valid version`)
    }
}

export function toPermissions(permissions: readonly string[]): Permission[] {
    return permissions.map((p) => {
        const perm = p as Permission
        return perm
    })
}
