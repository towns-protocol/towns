import { ethers } from 'ethers'

import { Address, EntitlementStruct } from './ContractTypes'
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

export function encodeUsers(users: string[] | Address[]) {
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

export function createUserEntitlementStruct(
    moduleAddress: string,
    users: string[],
): EntitlementStruct {
    const data = encodeUsers(users)
    return {
        module: moduleAddress,
        data,
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
