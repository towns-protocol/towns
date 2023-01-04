/* eslint-disable no-restricted-imports */

import { ContractTransaction } from 'ethers'
import type { DataTypes as SpaceFactoryDataTypes } from '@harmony/contracts/localhost/typings/SpaceFactory'

export interface ISpaceDapp {
    createSpace: (
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        everyonePermissions: string[],
        extraEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
    ) => Promise<ContractTransaction>
    createChannel: (
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
    ) => Promise<ContractTransaction>
}
