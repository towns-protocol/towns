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
        switch (this.chainId) {
            case 31337:
                {
                    const localhostSpace = this.read as LocalhostContract
                    const entitlementModules = await localhostSpace.getEntitlementModules()
                    for (const m of entitlementModules) {
                        modules.push({
                            address: m.module,
                            moduleType: m.moduleType as EntitlementModuleType,
                            name: m.name,
                        })
                    }
                }
                break
            case 5:
                {
                    const goerliSpace = this.read as GoerliContract
                    const entitlementAddresses = await goerliSpace.getEntitlements()
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
                }
                break
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
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
