import { ethers } from 'ethers'

import { Address, Hex, decodeAbiParameters, encodeAbiParameters, parseAbiParameters } from 'viem'
import { EntitlementStruct, ExternalTokenStruct, Versions, defaultVersion } from './ContractTypes'

const UserAddressesEncoding = 'address[]'

function getExternalTokenEncoding(version = defaultVersion) {
    if (version === 'v3') {
        return 'tuple(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'
    } else {
        return '(address contractAddress, uint256 quantity, bool isSingleToken, uint256[] tokenIds)[]'
    }
}

export function encodeUsers(users: string[] | Address[], version: Versions = defaultVersion) {
    switch (version) {
        case 'v3': {
            const abiCoder = ethers.utils.defaultAbiCoder
            const encodedData = abiCoder.encode([UserAddressesEncoding], [users])
            return encodedData
        }
        case 'v4': {
            return encodeAbiParameters(parseAbiParameters([UserAddressesEncoding]), [
                users as Address[],
            ])
        }
        default: {
            throw new Error(`encodeUsers(): not a valid version`)
        }
    }
}

export function decodeUsers(encodedData: string, version = defaultVersion): string[] {
    switch (version) {
        case 'v3': {
            const abiCoder = ethers.utils.defaultAbiCoder
            const decodedData = abiCoder.decode([UserAddressesEncoding], encodedData) as string[][]
            let u: string[] = []
            if (decodedData.length) {
                // decoded value is in element 0 of the array
                u = decodedData[0]
            }
            return u
        }
        case 'v4': {
            const decodedData = decodeAbiParameters(
                parseAbiParameters([UserAddressesEncoding]),
                encodedData as Hex,
            )
            let u: Hex[] = []
            if (decodedData.length) {
                // decoded value is in element 0 of the array
                u = decodedData[0].slice()
            }
            return u
        }
        default: {
            throw new Error(`decodeUsers(): not a valid version`)
        }
    }
}

export function createTokenEntitlementStruct(
    moduleAddress: string,
    tokens: ExternalTokenStruct<typeof version>[],
    version: Versions = defaultVersion,
): EntitlementStruct<typeof version> {
    switch (version) {
        case 'v3': {
            const data = encodeExternalTokens(tokens as ExternalTokenStruct<'v3'>[], 'v3')
            return {
                module: moduleAddress,
                data,
            }
        }
        case 'v4': {
            const data = encodeExternalTokens(tokens as ExternalTokenStruct<'v4'>[], 'v4')
            return {
                module: moduleAddress,
                data,
            }
        }
        default: {
            throw new Error(`createTokenEntitlementStruct(): not a valid version`)
        }
    }
}

export function createUserEntitlementStruct(
    moduleAddress: string,
    users: string[],
    version: Versions = defaultVersion,
): EntitlementStruct<typeof version> {
    switch (version) {
        case 'v3':
        case 'v4': {
            const data = encodeUsers(users, version)
            return {
                module: moduleAddress,
                data,
            } as EntitlementStruct<typeof version>
        }

        default: {
            throw new Error(`createUserEntitlementStruct(): not a valid version`)
        }
    }
}

export function encodeExternalTokens(
    tokens: ExternalTokenStruct<typeof version>[],
    version: Versions = defaultVersion,
): string {
    const externalTokenConfig = getExternalTokenEncoding(version)
    switch (version) {
        case 'v3': {
            const abiCoder = ethers.utils.defaultAbiCoder
            const encodedData = abiCoder.encode([externalTokenConfig], [tokens])
            return encodedData
        }
        case 'v4': {
            return encodeAbiParameters(parseAbiParameters([externalTokenConfig]), [
                tokens as ExternalTokenStruct<'v4'>[],
            ])
        }
        default: {
            throw new Error(`encodeExternalTokens(): not a valid version`)
        }
    }
}

export function decodeExternalTokens(encodedData: string, version: Versions = defaultVersion) {
    const externalTokenConfig = getExternalTokenEncoding(version)

    switch (version) {
        case 'v3': {
            const abiCoder = ethers.utils.defaultAbiCoder
            const decodedData = abiCoder.decode(
                [externalTokenConfig],
                encodedData,
            ) as ExternalTokenStruct<'v3'>[][]
            let t: ExternalTokenStruct<'v3'>[] = []
            if (decodedData.length) {
                // decoded value is in element 0 of the array
                t = decodedData[0]
            }
            return t
        }
        case 'v4': {
            const decodedData = decodeAbiParameters(
                parseAbiParameters([externalTokenConfig]),
                encodedData as Hex,
            )
            let t: ExternalTokenStruct<'v4'>[] = []
            if (decodedData.length) {
                // decoded value is in element 0 of the array
                t = (decodedData as unknown as ExternalTokenStruct<'v4'>[][])[0]
            }

            return t
        }

        default: {
            throw new Error(`decodeExternalTokens(): not a valid version`)
        }
    }
}
