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
import { Channel, EntitlementModule, EntitlementModuleType, Permission } from '../ContractTypes'

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
                            address: m.moduleAddress,
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

    public async getChannels(): Promise<Channel[]> {
        const channels: Channel[] = []
        switch (this.chainId) {
            case 31337:
                {
                    const localhostSpace = this.read as LocalhostContract
                    const channelHashes = await localhostSpace.getChannels()
                    const channelPromises: Promise<LocalhostDataTypes.ChannelStruct>[] = []
                    for (const hash of channelHashes) {
                        channelPromises.push(localhostSpace.channelsByHash(hash))
                    }
                    const channelData = await Promise.all(channelPromises)
                    for (const channel of channelData) {
                        channels.push({
                            name: channel.name as string,
                            channelNetworkId: channel.channelNetworkId as string,
                            disabled: channel.disabled as boolean,
                        })
                    }
                }
                break
            case 5:
                throw new Error('Not implemented')
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
        return channels
    }

    public async getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
        switch (this.chainId) {
            case 31337: {
                const localhostSpace = this.read as LocalhostContract
                return localhostSpace.getPermissionsByRoleId(roleId) as Promise<Permission[]>
            }
            case 5: {
                const goerliSpace = this.read as GoerliContract
                const permissions = await goerliSpace.getPermissionsByRoleId(roleId)
                return this.decodePermissionsBytes(permissions)
            }
            default:
                throw new Error(`Unsupported chainId: ${this.chainId}`)
        }
    }

    public encodeAddPermissionsToRole(roleId: number, permissions: Permission[]): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        switch (this.chainId) {
            case 31337:
                {
                    const localhostSpace = this.interface as LocalhostInterface
                    encodedCallData.push(
                        localhostSpace.encodeFunctionData('addPermissionsToRole', [
                            roleId,
                            permissions,
                        ]),
                    )
                }
                break
            case 5:
                {
                    const goerliSpace = this.interface as GoerliInterface
                    for (const p of permissions) {
                        const addPermission = goerliSpace.encodeFunctionData(
                            'addPermissionToRole',
                            [roleId, p],
                        )
                        encodedCallData.push(addPermission)
                    }
                }
                break
            default:
                throw new Error(`Unsupported chainId: ${this.chainId}`)
        }

        return encodedCallData
    }

    public encodeRemovePermissionsFromRole(roleId: number, permissions: Permission[]): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        switch (this.chainId) {
            case 31337:
                {
                    const localhostSpace = this.interface as LocalhostInterface
                    encodedCallData.push(
                        localhostSpace.encodeFunctionData('removePermissionsFromRole', [
                            roleId,
                            permissions,
                        ]),
                    )
                }
                break
            case 5:
                {
                    const goerliSpace = this.interface as GoerliInterface
                    for (const p of permissions) {
                        const addPermission = goerliSpace.encodeFunctionData(
                            'removePermissionFromRole',
                            [roleId, p],
                        )
                        encodedCallData.push(addPermission)
                    }
                }
                break
            default:
                throw new Error(`Unsupported chainId: ${this.chainId}`)
        }

        return encodedCallData
    }

    private decodePermissionsBytes(_permissions: BytesLike[]): Permission[] {
        const permissions = _permissions.map((permission) => {
            return ethers.utils.parseBytes32String(permission) as Permission
        })
        return permissions
    }
}
