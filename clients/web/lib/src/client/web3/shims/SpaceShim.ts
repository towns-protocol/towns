/* eslint-disable no-restricted-imports */

import {
    Space as GoerliContract,
    SpaceInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/Space'
import {
    Space as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Space'
import { BytesLike, ethers } from 'ethers'
import { EntitlementModule, EntitlementModuleType, Permission } from '../ContractTypes'

import { BaseContractShim } from './BaseContractShim'
import { ShimFactory } from './ShimFactory'

export type { LocalhostDataTypes as SpaceDataTypes }

export class SpaceShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {
    public async getEntitlementModules(): Promise<EntitlementModule[]> {
        const modules: EntitlementModule[] = []
        const entitlementAddresses = await this.read.getEntitlements()
        for (const address of entitlementAddresses) {
            const entitlementModule = ShimFactory.createEntitlementModule(
                address,
                this.chainId,
                this.provider,
                this.signer,
            )
            const [moduleType, name] = await Promise.all([
                entitlementModule.read.moduleType(),
                entitlementModule.read.name(),
            ])
            modules.push({
                address,
                moduleType: moduleType as EntitlementModuleType,
                name,
            })
        }
        return modules
    }

    public async getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
        const permissions = await this.read.getPermissionsByRoleId(roleId)
        return this.decodePermissionsBytes(permissions)
    }

    private decodePermissionsBytes(_permissions: BytesLike[]): Permission[] {
        const permissions = _permissions.map((permission) => {
            return ethers.utils.parseBytes32String(permission) as Permission
        })
        return permissions
    }
}
