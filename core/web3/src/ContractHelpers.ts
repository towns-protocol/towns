import { BigNumber, BigNumberish, ethers } from 'ethers'

import { Versions, BasicRoleInfo, Permission, defaultVersion, Address } from './ContractTypes'
import { getContractsInfo } from './IStaticContractsInfo'
import { ISpaceDapp } from './ISpaceDapp'
import {
    ITownArchitectBase as ITownArchitectBaseV3,
    MockERC721AShim as MockERC721AShimV3,
    TokenEntitlementDataTypes,
    IMembershipBase as IMembershipBaseV3,
} from './v3'

import { getTestGatingNFTContractAddress } from './TestGatingNFT'

export function mintMockNFT(
    chainId: number,
    provider: ethers.providers.Provider,
    fromWallet: ethers.Wallet,
    toAddress: string,
): Promise<ethers.ContractTransaction> {
    if (chainId === 31337) {
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        const mockNFT = new MockERC721AShimV3(mockNFTAddress, chainId, provider)
        return mockNFT.write(fromWallet).mintTo(toAddress)
    }
    throw new Error(`Unsupported chainId ${chainId}, only 31337 is supported.`)
}

export function balanceOfMockNFT(
    chainId: number,
    provider: ethers.providers.Provider,
    address: Address,
) {
    if (chainId === 31337) {
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        const mockNFT = new MockERC721AShimV3(mockNFTAddress, chainId, provider)
        return mockNFT.read.balanceOf(address)
    }
    throw new Error(`Unsupported chainId ${chainId}, only 31337 is supported.`)
}

export async function getTestGatingNftAddress(_chainId: number): Promise<string> {
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
    version = defaultVersion,
): boolean {
    if (version === 'v3') {
        for (const r of roleIds as BigNumber[]) {
            if (r.eq(roleId)) {
                return true
            }
        }
    } else {
        for (const r of roleIds) {
            if (r === roleId) {
                return true
            }
        }
    }

    return false
}

/**
 * TODO: these are only used in tests, should move them to different file?
 */

function isMembershipStructV3(
    returnValue: ITownArchitectBaseV3.MembershipStruct,
): returnValue is ITownArchitectBaseV3.MembershipStruct {
    return typeof returnValue.settings.price === 'number'
}

type CreateMembershipStructArgs = {
    name: string
    permissions: Permission[]
    tokenAddresses: string[]
    version?: Versions
} & Omit<
    IMembershipBaseV3.MembershipInfoStruct,
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
    tokenAddresses,
    version = defaultVersion,
}: CreateMembershipStructArgs): ITownArchitectBaseV3.MembershipStruct {
    if (version === 'v3') {
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
            requirements: {
                everyone: tokenAddresses.length === 0,
                tokens: createExternalTokenStruct(tokenAddresses),
                users: [],
                rule: ethers.constants.AddressZero,
            },
        }
    } else {
        return {
            settings: {
                name,
                symbol: 'MEMBER',
                price: BigInt(0),
                maxSupply: BigInt(1000),
                duration: BigInt(0),
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0,
                pricingModule: ethers.constants.AddressZero,
            },
            permissions,
            requirements: {
                everyone: tokenAddresses.length === 0,
                tokens: createExternalTokenStruct(tokenAddresses),
                users: [],
                rule: ethers.constants.AddressZero,
            },
        }
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

export function createExternalTokenStruct(
    tokenAddresses: string[],
): TokenEntitlementDataTypes.ExternalTokenStruct[] {
    const tokenStruct: TokenEntitlementDataTypes.ExternalTokenStruct[] = tokenAddresses.map(
        (address) => ({
            contractAddress: address,
            isSingleToken: false,
            quantity: 1,
            tokenIds: [],
        }),
    )
    return tokenStruct
}
