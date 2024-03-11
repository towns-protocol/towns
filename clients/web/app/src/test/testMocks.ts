import { BigNumber } from 'ethers'
// eslint-disable-next-line no-restricted-imports
import * as townsClient from 'use-towns-client'
import { NoopRuleData, Permission } from '@river/web3'
import { EVERYONE_ADDRESS } from 'utils'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
import { TokenType } from '@components/Tokens/types'
import { getWalletAddress } from './testUtils'
import { TEST_NFT_COLLECTION_METADATA_ADDRESSES } from '../../mocks/token-collections'

const CHANNEL_ID = 'channel1'
const SPACE_ID = 'town1'

export const spaceRoomIdentifier = SPACE_ID

export const channelRoomIdentifier = CHANNEL_ID

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
    channelNetworkId: channelRoomIdentifier,
    disabled: false,
}

export const roleDataWithBothRolesAssignedToChannel: townsClient.RoleDetails[] = [
    {
        id: 7,
        name: 'Everyone',
        permissions: [Permission.Read],
        users: [EVERYONE_ADDRESS],
        channels: [channelDataForRole],
        ruleData: NoopRuleData,
    },
    {
        id: 8,
        name: 'Member',
        permissions: [Permission.Read, Permission.Write],
        users: [],
        channels: [channelDataForRole],
        ruleData: townsClient.createOperationsTree([
            {
                address: TEST_NFT_COLLECTION_METADATA_ADDRESSES[0] as townsClient.Address,
                chainId: BigInt(1),
                type: convertTokenTypeToOperationType(TokenType.ERC1155),
            },
            {
                address: TEST_NFT_COLLECTION_METADATA_ADDRESSES[1] as townsClient.Address,
                chainId: BigInt(1),
                type: convertTokenTypeToOperationType(TokenType.ERC721),
            },
        ]),
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

export const mockMembers: townsClient.RoomMember[] = [
    {
        userId: address1,
        username: 'User 1',
        usernameConfirmed: true,
        usernameEncrypted: false,
        displayName: 'User 1',
        displayNameEncrypted: false,
    },
    {
        userId: address2,
        username: 'User 2',
        usernameConfirmed: true,
        usernameEncrypted: false,
        displayName: 'User 2',
        displayNameEncrypted: false,
    },
]

export const mockMemberIds = mockMembers.map((m) => m.userId)

export const mockUsersMap = mockMembers.reduce((acc, curr) => {
    acc[curr.userId] = curr
    return acc
}, {} as { [key: string]: townsClient.RoomMember })
