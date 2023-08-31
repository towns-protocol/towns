import { BigNumber, BigNumberish, ethers } from 'ethers'

import { BasicRoleInfo } from './ContractTypes'
import { MockERC721AShim } from './v3/MockERC721AShim'
import { TokenEntitlementDataTypes } from './v3/TokenEntitlementShim'
import { ZionClient } from '../ZionClient'
import { getContractsInfoV3 } from './v3/IStaticContractsInfoV3'

export function mintMockNFT(
    chainId: number,
    provider: ethers.providers.Provider,
    fromWallet: ethers.Wallet,
    toAddress: string,
): Promise<ethers.ContractTransaction> {
    if (chainId === 31337) {
        const mockNFTAddress = getContractsInfoV3(chainId).mockErc721aAddress
        const mockNFT = new MockERC721AShim(mockNFTAddress, chainId, provider)
        return mockNFT.write(fromWallet).mintTo(toAddress)
    }
    throw new Error(`Unsupported chainId ${chainId}, only 31337 is supported.`)
}

export function getMemberNftAddress(chainId: number): string {
    const contractInfo = getContractsInfoV3(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.memberTokenAddress
}

export function getPioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfoV3(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.pioneerTokenAddress
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

export async function getFilteredRolesFromSpace(
    client: ZionClient,
    spaceNetworkId: string,
): Promise<BasicRoleInfo[]> {
    const spaceRoles = await client.spaceDapp.getRoles(spaceNetworkId)
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

export function isRoleIdInArray(roleIds: BigNumber[], roleId: BigNumberish): boolean {
    for (const r of roleIds) {
        if (r.eq(roleId)) {
            return true
        }
    }
    return false
}
