import { SpaceDataTypes } from '../shims/SpaceShim'
import { TokenDataTypes } from '../shims/TokenEntitlementShim'
import { ethers } from 'ethers'

const UserAddressesEncoding = 'address[]'
const ExternalTokenEncoding =
    'tuple(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'

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
