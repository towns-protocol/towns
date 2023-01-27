import { SpaceDataTypes } from './shims/SpaceShim'
import { SpaceFactoryDataTypes } from './shims/SpaceFactoryShim'
import { TokenDataTypes } from './shims/TokenEntitlementShim'
import { ZionClient } from '../ZionClient'
import { ethers } from 'ethers'
import { getContractsInfo } from './IStaticContractsInfo'

const UserAddressesEncoding = 'address[]'
const ExternalTokenEncoding =
    'tuple(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'

export function getCouncilNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.councilNft.address.councilnft
}

export function getZioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.zioneerNft.address.zioneer
}

export function createExternalTokenStruct(
    tokenAddresses: string[],
): SpaceFactoryDataTypes.ExternalTokenStruct[] {
    const tokenStruct: SpaceFactoryDataTypes.ExternalTokenStruct[] = tokenAddresses.map(
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
): Promise<SpaceDataTypes.RoleStructOutput[]> {
    const spaceRoles = await client.spaceDapp.getRoles(spaceNetworkId)
    const filteredRoles: SpaceDataTypes.RoleStructOutput[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        const permissions = await client.spaceDapp.getPermissionsByRoleId(
            spaceNetworkId,
            r.roleId.toNumber(),
        )
        // Filter out roles which have no permissions & the Owner role
        if (permissions.length && r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}

export function encodeExternalTokens(tokens: SpaceFactoryDataTypes.ExternalTokenStruct[]): string {
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
