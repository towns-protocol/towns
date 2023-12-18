import { BigNumber } from 'ethers'
// eslint-disable-next-line no-restricted-imports
import * as zionClient from 'use-zion-client'
import { Permission } from '@river/web3'
import { EVERYONE_ADDRESS } from 'utils'
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { MOCK_CONTRACT_METADATA_ADDRESSES } from '../../mocks/token-collections'
import { getWalletAddress } from './testUtils'

const CHANNEL_ID = 'channel1'
const SPACE_ID = 'town1'

export const spaceRoomIdentifier = {
    streamId: SPACE_ID,
}

export const channelRoomIdentifier = {
    streamId: CHANNEL_ID,
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
    channelNetworkId: channelRoomIdentifier.streamId,
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
        userId: address1,
        username: 'User 1',
        usernameConfirmed: true,
        displayName: 'User 1',
    },
    {
        userId: address2,
        username: 'User 2',
        usernameConfirmed: true,
        displayName: 'User 2',
    },
]

export const mockMemberIds = mockMembers.map((m) => m.userId)

export const mockUsersMap = mockMembers.reduce((acc, curr) => {
    acc[curr.userId] = curr
    return acc
}, {} as { [key: string]: zionClient.RoomMember })
