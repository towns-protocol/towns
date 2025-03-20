import { BigNumber, constants } from 'ethers'
// eslint-disable-next-line no-restricted-imports
import * as townsClient from 'use-towns-client'
import { NoopRuleData, Permission } from '@towns-protocol/web3'
import { EVERYONE_ADDRESS } from 'utils'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
import { TokenType } from '@components/Tokens/types'
import { parseUnits } from 'hooks/useBalance'
import { getWalletAddress } from './testUtils'
import { TEST_TOKEN_METADATA_ADDRESSES } from '../../mocks/token-collections'

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
        ruleData: {
            kind: 'v2',
            rules: NoopRuleData,
        },
    },
    {
        id: 8,
        name: 'Member',
        permissions: [Permission.Read, Permission.Write],
        users: [],
        channels: [channelDataForRole],
        ruleData: {
            kind: 'v2',
            rules: townsClient.createOperationsTree([
                {
                    address: TEST_TOKEN_METADATA_ADDRESSES[0] as townsClient.Address,
                    chainId: 1n,
                    type: convertTokenTypeToOperationType(TokenType.ERC20),
                    threshold: parseUnits('1', 18),
                },
                {
                    address: TEST_TOKEN_METADATA_ADDRESSES[1] as townsClient.Address,
                    chainId: 1n,
                    type: convertTokenTypeToOperationType(TokenType.ERC721),
                    threshold: 1n,
                },
            ]),
        },
    },
    {
        id: 9,
        name: 'ETH Gated Role',
        permissions: [Permission.Read, Permission.Write],
        users: [],
        channels: [channelDataForRole],
        ruleData: {
            kind: 'v2',
            rules: townsClient.createOperationsTree([
                {
                    address: constants.AddressZero,
                    chainId: BigInt(1),
                    type: townsClient.CheckOperationType.ETH_BALANCE,
                    threshold: parseUnits('0.1', 18),
                },
            ]),
        },
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

export const mockMembers: townsClient.TownsStreamMember[] = [
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
}, {} as { [key: string]: townsClient.TownsStreamMember })
