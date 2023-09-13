import { BigNumber } from 'ethers'
// eslint-disable-next-line no-restricted-imports
import * as zionClient from 'use-zion-client'
import { Permission } from 'use-zion-client'
import { EVERYONE_ADDRESS } from 'utils'
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { MOCK_CONTRACT_METADATA_ADDRESSES } from '../../mocks/token-collections'
import { getWalletAddress } from './testUtils'

const CHANNEL_ID = 'channel1'
const SPACE_ID = 'town1'

export const spaceRoomIdentifier = {
    slug: SPACE_ID,
    protocol: zionClient.SpaceProtocol.Matrix,
    networkId: SPACE_ID,
}

export const channelRoomIdentifier = {
    slug: CHANNEL_ID,
    protocol: zionClient.SpaceProtocol.Matrix,
    networkId: CHANNEL_ID,
}

type ContractRole = {
    roleId: BigNumber
    name: string
}

export const everyoneRole: ContractRole = {
    roleId: BigNumber.from(7),
    name: 'Everyone',
}

export const memberRole: ContractRole = {
    roleId: BigNumber.from(8),
    name: 'Member',
}

export const channelDataForRole: {
    name: string
    channelNetworkId: string
    disabled: boolean
} = {
    name: 'Channel 1',
    channelNetworkId: channelRoomIdentifier.networkId,
    disabled: false,
}

export const roleDataWithBothRolesAssignedToChannel: zionClient.RoleDetails[] = [
    {
        id: 7,
        name: 'Everyone',
        permissions: [Permission.Read],
        tokens: [],
        users: [EVERYONE_ADDRESS],
        channels: [channelDataForRole],
    },
    {
        id: 8,
        name: 'Member',
        permissions: [Permission.Read, Permission.Write],
        tokens: [
            createTokenEntitlementStruct({
                contractAddress: MOCK_CONTRACT_METADATA_ADDRESSES[0],
                tokenIds: [],
            }),
            createTokenEntitlementStruct({
                contractAddress: MOCK_CONTRACT_METADATA_ADDRESSES[1],
                tokenIds: [],
            }),
        ],
        users: [],
        channels: [channelDataForRole],
    },
]

export const roleDataWithMemberAssignedToChannel = [
    {
        ...roleDataWithBothRolesAssignedToChannel[0],
        channels: [],
    },
    {
        ...roleDataWithBothRolesAssignedToChannel[1],
        channels: [channelDataForRole],
    },
]

const address1 = getWalletAddress()
const address2 = getWalletAddress()

export const mockMembers: zionClient.RoomMember[] = [
    {
        userId: `@:${
            zionClient.createUserIdFromEthereumAddress(address1, 5).matrixUserIdLocalpart
        }:localhost`,
        name: 'User 1',
        rawDisplayName: 'User 1',
        membership: zionClient.Membership.Join,
        disambiguate: false,
    },
    {
        userId: `@:${
            zionClient.createUserIdFromEthereumAddress(address2, 5).matrixUserIdLocalpart
        }:localhost`,
        name: 'User 2',
        rawDisplayName: 'User 2',
        membership: zionClient.Membership.Join,
        disambiguate: false,
    },
]
