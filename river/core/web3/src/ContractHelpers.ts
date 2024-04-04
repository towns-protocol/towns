import { BigNumber, BigNumberish, ethers } from 'ethers'

import { BasicRoleInfo, Permission, Address } from './ContractTypes'
import { BaseChainConfig } from './IStaticContractsInfo'
import { ISpaceDapp } from './ISpaceDapp'
import {
    IArchitectBase as ISpaceArchitectBaseV3,
    MockERC721AShim as MockERC721AShimV3,
    IMembershipBase as IMembershipBaseV3,
} from './v3'

import { getTestGatingNFTContractAddress } from './TestGatingNFT'

export function mintMockNFT(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
    fromWallet: ethers.Wallet,
    toAddress: string,
): Promise<ethers.ContractTransaction> {
    if (!config.addresses.mockNFT) {
        throw new Error('No mock ERC721 address provided')
    }
    const mockNFTAddress = config.addresses.mockNFT
    const mockNFT = new MockERC721AShimV3(mockNFTAddress, config.contractVersion, provider)
    return mockNFT.write(fromWallet).mintTo(toAddress)
}

export function balanceOfMockNFT(
    config: BaseChainConfig,
    provider: ethers.providers.Provider,
    address: Address,
) {
    if (!config.addresses.mockNFT) {
        throw new Error('No mock ERC721 address provided')
    }
    const mockNFTAddress = config.addresses.mockNFT
    const mockNFT = new MockERC721AShimV3(mockNFTAddress, config.contractVersion, provider)
    return mockNFT.read.balanceOf(address)
}

export async function getTestGatingNftAddress(_chainId: number): Promise<`0x${string}`> {
    return await getTestGatingNFTContractAddress()
}

export async function getFilteredRolesFromSpace(
    spaceDapp: ISpaceDapp,
    spaceNetworkId: string,
): Promise<BasicRoleInfo[]> {
    const spaceRoles = await spaceDapp.getRoles(spaceNetworkId)
    const filteredRoles: BasicRoleInfo[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        // Filter out roles which have no permissions & the Owner role
        if (r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}

export function isRoleIdInArray(
    roleIds: BigNumber[] | readonly bigint[],
    roleId: BigNumberish | bigint,
): boolean {
    for (const r of roleIds as BigNumber[]) {
        if (r.eq(roleId)) {
            return true
        }
    }
    return false
}

/**
 * TODO: these are only used in tests, should move them to different file?
 */

function isMembershipStructV3(
    returnValue: ISpaceArchitectBaseV3.MembershipStruct,
): returnValue is ISpaceArchitectBaseV3.MembershipStruct {
    return typeof returnValue.settings.price === 'number'
}

type CreateMembershipStructArgs = {
    name: string
    permissions: Permission[]
    requirements: ISpaceArchitectBaseV3.MembershipRequirementsStruct
} & Omit<
    IMembershipBaseV3.MembershipStruct,
    | 'symbol'
    | 'price'
    | 'maxSupply'
    | 'duration'
    | 'currency'
    | 'feeRecipient'
    | 'freeAllocation'
    | 'pricingModule'
>
function _createMembershipStruct({
    name,
    permissions,
    requirements,
}: CreateMembershipStructArgs): ISpaceArchitectBaseV3.MembershipStruct {
    return {
        settings: {
            name,
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: ethers.constants.AddressZero,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions,
        requirements,
    }
}

export function createMembershipStruct(args: CreateMembershipStructArgs) {
    const result = _createMembershipStruct(args)
    if (isMembershipStructV3(result)) {
        return result
    } else {
        throw new Error("createMembershipStruct: version is not 'v3'")
    }
}
