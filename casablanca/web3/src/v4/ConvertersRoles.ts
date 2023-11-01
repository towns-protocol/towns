import { Permission } from './ContractTypesV4'
// import { createTokenEntitlementStruct, createUserEntitlementStruct } from './ConvertersEntitlements'

// import { IRolesBase } from './IRolesShim'
// import { Town } from './Town'
// import { TokenEntitlementDataTypes } from './TokenEntitlementShim'

// export async function createEntitlementStruct(
//     town: Town,
//     tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
//     users: string[],
// ): Promise<IRolesBase.CreateEntitlementStruct[]> {
//     // figure out the addresses for each entitlement module
//     const entitlementModules = await town.Entitlements.read.getEntitlements()
//     let tokenEntitlementAddress = ''
//     let userEntitlementAddress = ''
//     for (const module of entitlementModules) {
//         switch (module.moduleType) {
//             case EntitlementModuleType.TokenEntitlement:
//                 tokenEntitlementAddress = module.moduleAddress
//                 break
//             case EntitlementModuleType.UserEntitlement:
//                 userEntitlementAddress = module.moduleAddress
//                 break
//         }
//     }
//     if (tokens.length && !tokenEntitlementAddress) {
//         throw new Error('Token entitlement moodule address not found.')
//     }
//     if (users.length && !userEntitlementAddress) {
//         throw new Error('User entitlement moodule address not found.')
//     }

//     // create the entitlements array
//     const entitlements: IRolesBase.CreateEntitlementStruct[] = []
//     if (tokens.length) {
//         // create the token entitlement
//         const tokenEntitlement: IRolesBase.CreateEntitlementStruct = createTokenEntitlementStruct(
//             tokenEntitlementAddress,
//             tokens,
//         )
//         entitlements.push(tokenEntitlement)
//     }
//     // create the user entitlement
//     if (users.length) {
//         const userEntitlement: IRolesBase.CreateEntitlementStruct = createUserEntitlementStruct(
//             userEntitlementAddress,
//             users,
//         )
//         entitlements.push(userEntitlement)
//     }
//     // return the converted entitlements
//     return entitlements
// }

export function toPermissions(permissions: readonly string[]): Permission[] {
    return permissions.map((p) => {
        const perm = p as Permission
        return perm
    })
}
