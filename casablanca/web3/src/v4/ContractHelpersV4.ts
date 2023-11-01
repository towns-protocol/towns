import { BasicRoleInfo, Permission } from './ContractTypesV4'
import { MockERC721AShim } from './MockERC721AShim'
import { getContractsInfoV4 } from './IStaticContractsInfoV4'
import { ISpaceDapp } from './ISpaceDapp'
import { Address, PublicClient, WalletClient, zeroAddress } from 'viem'
import { ITownArchitectBase, SpaceDappTransaction, TokenEntitlementDataTypes } from './types'

export function mintMockNFT(
    chainId: number,
    publicClient: PublicClient,
    fromWallet: WalletClient,
    toAddress: Address,
): Promise<SpaceDappTransaction> {
    if (chainId === 31337) {
        const mockNFTAddress = getContractsInfoV4(chainId).mockErc721aAddress
        const mockNFT = new MockERC721AShim(mockNFTAddress, chainId, publicClient)
        return mockNFT.write({
            functionName: 'mintTo',
            args: [toAddress],
            wallet: fromWallet,
        })
    }
    throw new Error(`Unsupported chainId ${chainId}, only 31337 is supported.`)
}

export function getMemberNftAddress(chainId: number): string | null {
    const contractInfo = getContractsInfoV4(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.memberTokenAddress ?? null
}

export function getPioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfoV4(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.pioneerTokenAddress
}

export function createExternalTokenStruct(
    tokenAddresses: Address[],
): TokenEntitlementDataTypes['ExternalTokenStruct'][] {
    const tokenStruct: TokenEntitlementDataTypes['ExternalTokenStruct'][] = tokenAddresses.map(
        (address) => ({
            contractAddress: address,
            isSingleToken: false,
            quantity: BigInt(1),
            tokenIds: [],
        }),
    )
    return tokenStruct
}

//
export function createMembershipStruct({
    name,
    permissions,
    tokenAddresses,
}: {
    permissions: Permission[]
    tokenAddresses: Address[]
} & Omit<
    ITownArchitectBase['MembershipInfoStruct'],
    'price' | 'limit' | 'currency' | 'requirements' | 'feeRecipient'
>): ITownArchitectBase['MembershipStruct'] {
    return {
        settings: {
            name,
            symbol: 'MEMBER',
            price: BigInt(0),
            limit: BigInt(1000),
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

export function isRoleIdInArray(roleIds: readonly bigint[], roleId: bigint): boolean {
    for (const r of roleIds) {
        if (r === roleId) {
            return true
        }
    }
    return false
}
