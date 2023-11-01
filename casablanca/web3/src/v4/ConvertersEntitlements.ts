import { Address, Hex, decodeAbiParameters, encodeAbiParameters, parseAbiParameters } from 'viem'
import { IRolesBase, TokenEntitlementDataTypes } from './types'

const UserAddressesEncoding = 'address[]'
const ExternalTokenEncoding =
    '(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'

export function encodeUsers(users: Address[]): Hex {
    return encodeAbiParameters(parseAbiParameters([UserAddressesEncoding]), [users])
}

export function decodeUsers(encodedData: Hex): Hex[] {
    const decodedData = decodeAbiParameters(
        parseAbiParameters([UserAddressesEncoding]),
        encodedData,
    )
    let u: Hex[] = []
    if (decodedData.length) {
        // decoded value is in element 0 of the array
        u = decodedData[0].slice()
    }
    return u
}

export function createTokenEntitlementStruct(
    moduleAddress: Address,
    tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][],
): IRolesBase['CreateEntitlementStruct'] {
    const data = encodeExternalTokens(tokens)
    return {
        module: moduleAddress,
        data,
    }
}

export function createUserEntitlementStruct(
    moduleAddress: Address,
    users: Address[],
): IRolesBase['CreateEntitlementStruct'] {
    const data = encodeUsers(users)
    return {
        module: moduleAddress,
        data,
    }
}

export function encodeExternalTokens(
    tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][],
): Hex {
    return encodeAbiParameters(parseAbiParameters([ExternalTokenEncoding]), [tokens])
}

export function decodeExternalTokens(
    encodedData: Hex,
): TokenEntitlementDataTypes['ExternalTokenStruct'][] {
    const decodedData = decodeAbiParameters(
        parseAbiParameters([ExternalTokenEncoding]),
        encodedData,
    )
    let t: TokenEntitlementDataTypes['ExternalTokenStruct'][] = []
    if (decodedData.length) {
        // decoded value is in element 0 of the array
        t = (decodedData as unknown as TokenEntitlementDataTypes['ExternalTokenStruct'][][])[0]
    }

    return t
}
