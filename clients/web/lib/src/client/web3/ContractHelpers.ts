import { BasicRoleInfo } from './ContractTypes'
import { SpaceDataTypes } from './shims/SpaceShim'
import { TokenDataTypes } from './shims/TokenEntitlementShim'
import { ZionClient } from '../ZionClient'
import { ethers } from 'ethers'
import { getContractsInfo } from './IStaticContractsInfo'

const UserAddressesEncoding = 'address[]'
const ExternalTokenEncoding =
    'tuple(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'

export function getMemberNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.memberNft.address
}

export function getPioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.pioneerNft.address
}

export function createExternalTokenStruct(
    tokenAddresses: string[],
): TokenDataTypes.ExternalTokenStruct[] {
    const tokenStruct: TokenDataTypes.ExternalTokenStruct[] = tokenAddresses.map((address) => ({
        contractAddress: address,
        isSingleToken: false,
        quantity: 1,
        tokenIds: [],
    }))
    return tokenStruct
}

export function createTokenEntitlementStruct(
    moduleAddress: string,
    tokens: TokenDataTypes.ExternalTokenStruct[],
): SpaceDataTypes.EntitlementStruct {
    const data = encodeExternalTokens(tokens)
    return {
        module: moduleAddress,
        data,
    }
}

export function createUserEntitlementStruct(
    moduleAddress: string,
    users: string[],
): SpaceDataTypes.EntitlementStruct {
    const data = encodeUsers(users)
    return {
        module: moduleAddress,
        data,
    }
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

export function encodeExternalTokens(tokens: TokenDataTypes.ExternalTokenStruct[]): string {
    const abiCoder = ethers.utils.defaultAbiCoder
    const encodedData = abiCoder.encode([ExternalTokenEncoding], [tokens])
    return encodedData
}

export function decodeExternalTokens(encodedData: string): TokenDataTypes.ExternalTokenStruct[] {
    const abiCoder = ethers.utils.defaultAbiCoder
    const decodedData = abiCoder.decode(
        [ExternalTokenEncoding],
        encodedData,
    ) as TokenDataTypes.ExternalTokenStruct[][]
    let t: TokenDataTypes.ExternalTokenStruct[] = []
    if (decodedData.length) {
        // decoded value is in element 0 of the array
        t = decodedData[0]
    }
    return t
}

export function encodeUsers(users: string[]): string {
    const abiCoder = ethers.utils.defaultAbiCoder
    const encodedData = abiCoder.encode([UserAddressesEncoding], [users])
    return encodedData
}

export function decodeUsers(encodedData: string): string[] {
    const abiCoder = ethers.utils.defaultAbiCoder
    const decodedData = abiCoder.decode([UserAddressesEncoding], encodedData) as string[][]
    let u: string[] = []
    if (decodedData.length) {
        // decoded value is in element 0 of the array
        u = decodedData[0]
    }
    return u
}
