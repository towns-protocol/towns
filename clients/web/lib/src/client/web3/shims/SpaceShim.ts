/* eslint-disable no-restricted-imports */

import { ChannelMetadata, Permission } from '../ContractTypes'
import {
    Space as GoerliContract,
    SpaceInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/Space'
import {
    Space as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Space'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as SpaceDataTypes }

export class SpaceShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {
    public async getChannels(): Promise<ChannelMetadata[]> {
        const channels: ChannelMetadata[] = []
        const channelHashes = await this.read.getChannels()
        const channelPromises: Promise<LocalhostDataTypes.ChannelStruct>[] = []
        for (const hash of channelHashes) {
            channelPromises.push(this.read.channelsByHash(hash))
        }
        const channelData = await Promise.all(channelPromises)
        for (const channel of channelData) {
            channels.push({
                name: channel.name as string,
                channelNetworkId: channel.channelNetworkId as string,
                disabled: channel.disabled as boolean,
            })
        }
        return channels
    }

    public async getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
        const localhostSpace = this.read as LocalhostContract
        return localhostSpace.getPermissionsByRoleId(roleId) as Promise<Permission[]>
    }
}
