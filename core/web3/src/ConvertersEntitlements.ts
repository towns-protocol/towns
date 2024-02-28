import { ethers } from 'ethers'

import {
    Address,
    EntitlementStruct,
    ExternalTokenStruct,
    Versions,
    defaultVersion,
} from './ContractTypes'

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

        default: {
            throw new Error(`decodeUsers(): not a valid version`)
        }
    }
}

export function createTokenEntitlementStruct(
    moduleAddress: string,
    tokens: ExternalTokenStruct[],
    version: Versions = defaultVersion,
): EntitlementStruct {
    switch (version) {
        case 'v3': {
            const data = encodeExternalTokens(tokens, 'v3')
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
): EntitlementStruct {
    switch (version) {
        case 'v3': {
            const data = encodeUsers(users, version)
            return {
                module: moduleAddress,
                data,
            } as EntitlementStruct
        }

        default: {
            throw new Error(`createUserEntitlementStruct(): not a valid version`)
        }
    }
}

export function encodeExternalTokens(
    tokens: ExternalTokenStruct[],
    version: Versions = defaultVersion,
): string {
    const externalTokenConfig = getExternalTokenEncoding(version)
    switch (version) {
        case 'v3':
            {
                const abiCoder = ethers.utils.defaultAbiCoder
                const encodedData = abiCoder.encode([externalTokenConfig], [tokens])
                return encodedData
            }
            {
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
            ) as ExternalTokenStruct[][]
            let t: ExternalTokenStruct[] = []
            if (decodedData.length) {
                // decoded value is in element 0 of the array
                t = decodedData[0]
            }
            return t
        }

        default: {
            throw new Error(`decodeExternalTokens(): not a valid version`)
        }
    }
}
