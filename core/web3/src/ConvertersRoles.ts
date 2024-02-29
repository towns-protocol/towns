import {
    EntitlementModuleType,
    ExternalTokenStruct,
    Permission,
    EntitlementStruct,
    defaultVersion,
    Versions,
} from './ContractTypes'
import { createTokenEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

import { Town as TownV3 } from './v3/Town'

export async function createEntitlementStruct<Town extends TownV3>(
    townIn: Town,
    tokens: ExternalTokenStruct[],
    users: string[],
    version: Versions = defaultVersion,
): Promise<EntitlementStruct[]> {
    switch (version) {
        case 'v3': {
            const town = townIn as TownV3
            // figure out the addresses for each entitlement module
            const entitlementModules = await town.Entitlements.read.getEntitlements()
            let tokenEntitlementAddress = ''
            let userEntitlementAddress = ''
            for (const module of entitlementModules) {
                switch (module.moduleType) {
                    case EntitlementModuleType.TokenEntitlement:
                        tokenEntitlementAddress = module.moduleAddress
                        break
                    case EntitlementModuleType.UserEntitlement:
                        userEntitlementAddress = module.moduleAddress
                        break
                }
            }
            if (tokens.length && !tokenEntitlementAddress) {
                throw new Error('Token entitlement moodule address not found.')
            }
            if (users.length && !userEntitlementAddress) {
                throw new Error('User entitlement moodule address not found.')
            }

            // create the entitlements array
            const entitlements: EntitlementStruct[] = []
            if (tokens.length) {
                // create the token entitlement
                const tokenEntitlement: EntitlementStruct = createTokenEntitlementStruct(
                    tokenEntitlementAddress,
                    tokens,
                )
                entitlements.push(tokenEntitlement)
            }
            // create the user entitlement
            if (users.length) {
                const userEntitlement: EntitlementStruct = createUserEntitlementStruct(
                    userEntitlementAddress,
                    users,
                )
                entitlements.push(userEntitlement)
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
