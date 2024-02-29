import { ethers } from 'ethers'

import { Address, EntitlementStruct, Versions, defaultVersion } from './ContractTypes'
import { Hex, decodeAbiParameters, parseAbiParameters } from 'viem'
import { encodeEntitlementData } from './entitlement'
import { IRuleEntitlement } from './v3'

const UserAddressesEncoding = 'address[]'

export function decodeRuleData(encodedData: string): string[] {
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
            }
        }

        default: {
            throw new Error(`createUserEntitlementStruct(): not a valid version`)
        }
    }
}

export function createRuleEntitlementStruct(
    moduleAddress: `0x${string}`,
    ruleData: IRuleEntitlement.RuleDataStruct,
): EntitlementStruct {
    const encoded = encodeEntitlementData(ruleData)
    return {
        module: moduleAddress,
        data: encoded,
    }
}
