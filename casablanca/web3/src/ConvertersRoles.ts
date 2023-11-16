import {
    EntitlementModuleType,
    ExternalTokenStruct,
    Permission,
    EntitlementStruct,
} from './ContractTypes'
import { createTokenEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

import { Town as TownV3 } from './v3/Town'
import { Town as TownV4 } from './v4/Town'
import { Address } from 'viem'

export async function createEntitlementStruct<Town extends TownV3 | TownV4>(
    townIn: Town,
    tokens: ExternalTokenStruct<typeof version>[],
    users: string[],
    version: 'v3' | 'v4' = 'v3',
): Promise<EntitlementStruct<typeof version>[]> {
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
            const entitlements: EntitlementStruct<'v3'>[] = []
            if (tokens.length) {
                // create the token entitlement
                const tokenEntitlement: EntitlementStruct<'v3'> = createTokenEntitlementStruct(
                    tokenEntitlementAddress,
                    tokens,
                )
                entitlements.push(tokenEntitlement)
            }
            // create the user entitlement
            if (users.length) {
                const userEntitlement: EntitlementStruct<'v3'> = createUserEntitlementStruct(
                    userEntitlementAddress,
                    users,
                )
                entitlements.push(userEntitlement)
            }
            // return the converted entitlements
            return entitlements
        }

        case 'v4': {
            const town = townIn as TownV4
            // figure out the addresses for each entitlement module
            const entitlementModules = await town.Entitlements.read({
                functionName: 'getEntitlements',
            })
            let tokenEntitlementAddress: Address | undefined = undefined
            let userEntitlementAddress: Address | undefined = undefined
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
            const entitlements: EntitlementStruct<'v4'>[] = []
            if (tokens.length && tokenEntitlementAddress) {
                // create the token entitlement
                const tokenEntitlement: EntitlementStruct<'v4'> = createTokenEntitlementStruct(
                    tokenEntitlementAddress,
                    tokens,
                    'v4',
                ) as EntitlementStruct<'v4'>
                entitlements.push(tokenEntitlement)
            }
            // create the user entitlement
            if (users.length && userEntitlementAddress) {
                const userEntitlement: EntitlementStruct<'v4'> = createUserEntitlementStruct(
                    userEntitlementAddress,
                    users,
                    'v4',
                ) as EntitlementStruct<'v4'>
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
