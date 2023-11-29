import { BigNumber, BigNumberish, ethers } from 'ethers'

import {
    Versions,
    BasicRoleInfo,
    Permission,
    TDefaultVersion,
    defaultVersion,
} from './ContractTypes'
import { getContractsInfo } from './IStaticContractsInfo'
import { ISpaceDapp } from './ISpaceDapp'
import { Address, PublicClient, WalletClient, zeroAddress } from 'viem'
import {
    ITownArchitectBase as ITownArchitectBaseV3,
    MockERC721AShim as MockERC721AShimV3,
    TokenEntitlementDataTypes,
    IMembershipBase as IMembershipBaseV3,
} from './v3'
import {
    SpaceDappTransaction,
    MockERC721AShim as MockERC721AShimV4,
    ITownArchitectBase as ITownArchitectBaseV4,
} from './v4'
import { isEthersProvider } from './Utils'

export function mintMockNFT(
    chainId: number,
    provider: ethers.providers.Provider | PublicClient,
    fromWallet: ethers.Wallet | WalletClient,
    toAddress: string,
): Promise<ethers.ContractTransaction | SpaceDappTransaction> {
    if (chainId === 31337) {
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        if (isEthersProvider(provider)) {
            const mockNFT = new MockERC721AShimV3(mockNFTAddress, chainId, provider)
            return mockNFT.write(fromWallet as ethers.Wallet).mintTo(toAddress)
        } else {
            const mockNFT = new MockERC721AShimV4(mockNFTAddress, chainId, provider)
            return mockNFT.write({
                functionName: 'mintTo',
                args: [toAddress as Address],
                wallet: fromWallet as WalletClient,
            })
        }
    }
    throw new Error(`Unsupported chainId ${chainId}, only 31337 is supported.`)
}

export function getMemberNftAddress(chainId: number): string | null {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.memberTokenAddress ?? null
}

export function getPioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.pioneerTokenAddress
}

export async function getFilteredRolesFromSpace<V extends Versions = TDefaultVersion>(
    spaceDapp: ISpaceDapp<V>,
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
    returnValue: ITownArchitectBaseV3.MembershipStruct | ITownArchitectBaseV4['MembershipStruct'],
): returnValue is ITownArchitectBaseV3.MembershipStruct {
    return typeof returnValue.settings.price === 'number'
}

type CreateMembershipStructArgs = {
    name: string
    permissions: Permission[]
    tokenAddresses: string[]
    version?: Versions
} & (
    | Omit<
          IMembershipBaseV3.MembershipInfoStruct,
          'symbol' | 'price' | 'maxSupply' | 'duration' | 'currency' | 'feeRecipient'
      >
    | Omit<
          ITownArchitectBaseV4['MembershipInfoStruct'],
          'symbol' | 'price' | 'maxSupply' | 'duration' | 'currency' | 'feeRecipient'
      >
)
function _createMembershipStruct({
    name,
    permissions,
    tokenAddresses,
    version = defaultVersion,
}: CreateMembershipStructArgs):
    | ITownArchitectBaseV3.MembershipStruct
    | ITownArchitectBaseV4['MembershipStruct'] {
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
            },
            permissions,
            requirements: {
                everyone: tokenAddresses.length === 0,
                tokens: createExternalTokenStruct(tokenAddresses),
                users: [],
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
                currency: zeroAddress,
                feeRecipient: zeroAddress,
            },
            permissions,
            requirements: {
                everyone: tokenAddresses.length === 0,
                tokens: createExternalTokenStruct(tokenAddresses),
                users: [],
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
