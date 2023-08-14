/* eslint-disable no-restricted-imports */

import { ChannelMetadata, Permission } from '../ContractTypes'
import {
    Space as GoerliContract,
    SpaceInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/Space'
import {
    Space as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Space'
import {
    Space as SepoliaContract,
    SpaceInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/Space'

import { BaseContractShim } from './BaseContractShim'
import { BigNumberish } from 'ethers'

export type { LocalhostDataTypes as SpaceDataTypes }

export class SpaceShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
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
                channelNetworkId: channel.channelId as string,
                disabled: channel.disabled as boolean,
            })
        }
        return channels
    }

    public async getPermissionsByRoleId(roleId: BigNumberish): Promise<Permission[]> {
        const localhostSpace = this.read as LocalhostContract
        return localhostSpace.getPermissionsByRoleId(roleId) as Promise<Permission[]>
    }
}
