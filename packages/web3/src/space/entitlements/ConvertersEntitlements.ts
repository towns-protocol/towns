import { ethers } from 'ethers'

import { Address, EntitlementModuleType, EntitlementStruct } from '../../types/ContractTypes'
import { IRuleEntitlementBase } from './RuleEntitlementShim'
import { IRuleEntitlementV2Base } from './RuleEntitlementV2Shim'
import {
    CheckOperationType,
    encodeRuleData,
    encodeRuleDataV2,
    encodeThresholdParams,
    decodeThresholdParams,
} from './entitlement'
import { Hex } from 'viem'
import { Space } from '../Space'

const UserAddressesEncoding = 'address[]'

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
    moduleAddress: Address,
    ruleData: IRuleEntitlementBase.RuleDataStruct,
): EntitlementStruct {
    const encoded = encodeRuleData(ruleData)
    return {
        module: moduleAddress,
        data: encoded,
    }
}

export function createRuleEntitlementV2Struct(
    moduleAddress: Address,
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): EntitlementStruct {
    const encoded = encodeRuleDataV2(ruleData)
    return {
        module: moduleAddress,
        data: encoded,
    }
}

export function convertRuleDataV1ToV2(
    ruleData: IRuleEntitlementBase.RuleDataStruct,
): IRuleEntitlementV2Base.RuleDataV2Struct {
    const operations: IRuleEntitlementBase.OperationStruct[] = ruleData.operations.map(
        (op): IRuleEntitlementV2Base.OperationStruct => {
            return { ...op }
        },
    )
    const logicalOperations = ruleData.logicalOperations.map(
        (op): IRuleEntitlementV2Base.LogicalOperationStruct => {
            return { ...op }
        },
    )
    const checkOperations = ruleData.checkOperations.map(
        (op): IRuleEntitlementV2Base.CheckOperationV2Struct => {
            switch (op.opType) {
                case CheckOperationType.MOCK:
                case CheckOperationType.ERC20:
                case CheckOperationType.ERC721:
                case CheckOperationType.ETH_BALANCE: {
                    const threshold = ethers.BigNumber.from(op.threshold).toBigInt()
                    return {
                        opType: op.opType,
                        chainId: op.chainId,
                        contractAddress: op.contractAddress,
                        params: encodeThresholdParams({ threshold }),
                    }
                }
                case CheckOperationType.ERC1155:
                    throw new Error('ERC1155 not supported for V1 Rule Data')

                case CheckOperationType.ISENTITLED:
                    return {
                        opType: op.opType,
                        chainId: op.chainId,
                        contractAddress: op.contractAddress,
                        params: `0x`,
                    }

                default:
                    throw new Error('Unsupported Check Operation Type')
            }
        },
    )
    return {
        operations,
        logicalOperations,
        checkOperations,
    } as IRuleEntitlementV2Base.RuleDataV2Struct
}

export function convertRuleDataV2ToV1(
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): IRuleEntitlementBase.RuleDataStruct {
    const operations: IRuleEntitlementBase.OperationStruct[] = ruleData.operations.map(
        (op): IRuleEntitlementV2Base.OperationStruct => {
            return { ...op }
        },
    )
    const logicalOperations = ruleData.logicalOperations.map(
        (op): IRuleEntitlementV2Base.LogicalOperationStruct => {
            return { ...op }
        },
    )
    const checkOperations = ruleData.checkOperations.map(
        (op): IRuleEntitlementBase.CheckOperationStruct => {
            switch (op.opType) {
                case CheckOperationType.MOCK:
                case CheckOperationType.ERC20:
                case CheckOperationType.ERC721:
                case CheckOperationType.ETH_BALANCE: {
                    const { threshold } = decodeThresholdParams(op.params as Hex)
                    return {
                        opType: op.opType,
                        chainId: op.chainId,
                        contractAddress: op.contractAddress,
                        threshold,
                    }
                }
                case CheckOperationType.ERC1155:
                    throw new Error('ERC1155 not supported for V1 Rule Data')

                case CheckOperationType.ISENTITLED:
                    return {
                        opType: op.opType,
                        chainId: op.chainId,
                        contractAddress: op.contractAddress,
                        threshold: 0n,
                    }

                default:
                    throw new Error('Unsupported Check Operation Type')
            }
        },
    )
    return {
        operations,
        logicalOperations,
        checkOperations,
    } as IRuleEntitlementBase.RuleDataStruct
}

export async function createLegacyEntitlementStruct(
    spaceIn: Space,
    users: string[],
    ruleData: IRuleEntitlementBase.RuleDataStruct,
): Promise<EntitlementStruct[]> {
    const space = spaceIn
    // figure out the addresses for each entitlement module
    const entitlementModules = await space.Entitlements.getEntitlements()
    let userEntitlementAddress
    let ruleEntitlementAddress
    for (const module of entitlementModules) {
        switch (module.moduleType as EntitlementModuleType) {
            case EntitlementModuleType.UserEntitlement:
                userEntitlementAddress = module.moduleAddress
                break
            case EntitlementModuleType.RuleEntitlement:
                ruleEntitlementAddress = module.moduleAddress
                break
        }
    }
    if (!userEntitlementAddress) {
        throw new Error('User entitlement module address not found.')
    }
    if (!ruleEntitlementAddress) {
        throw new Error('Rule entitlement module address not found.')
    }

    // create the entitlements array
    const entitlements: EntitlementStruct[] = []
    // create the user entitlement
    if (users.length) {
        const userEntitlement: EntitlementStruct = createUserEntitlementStruct(
            userEntitlementAddress,
            users,
        )
        entitlements.push(userEntitlement)
    }

    if (ruleData.operations.length > 0) {
        const ruleEntitlement: EntitlementStruct = createRuleEntitlementStruct(
            ruleEntitlementAddress as `0x{string}`,
            ruleData,
        )
        entitlements.push(ruleEntitlement)
    }
    // return the converted entitlements
    return entitlements
}

export async function createEntitlementStruct(
    spaceIn: Space,
    users: string[],
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
): Promise<EntitlementStruct[]> {
    const space = spaceIn
    // figure out the addresses for each entitlement module
    const entitlementModules = await space.Entitlements.getEntitlements()
    let userEntitlementAddress
    let ruleEntitlementAddress
    for (const module of entitlementModules) {
        switch (module.moduleType as EntitlementModuleType) {
            case EntitlementModuleType.UserEntitlement:
                userEntitlementAddress = module.moduleAddress
                break
            case EntitlementModuleType.RuleEntitlementV2:
                ruleEntitlementAddress = module.moduleAddress
                break
        }
    }
    if (!userEntitlementAddress) {
        throw new Error('User entitlement module address not found.')
    }
    if (!ruleEntitlementAddress) {
        throw new Error('Rule entitlement V2 module address not found.')
    }

    // create the entitlements array
    const entitlements: EntitlementStruct[] = []
    // create the user entitlement
    if (users.length) {
        const userEntitlement: EntitlementStruct = createUserEntitlementStruct(
            userEntitlementAddress,
            users,
        )
        entitlements.push(userEntitlement)
    }

    if (ruleData.operations.length > 0) {
        const ruleEntitlement: EntitlementStruct = createRuleEntitlementV2Struct(
            ruleEntitlementAddress as Address,
            ruleData,
        )
        entitlements.push(ruleEntitlement)
    }
    // return the converted entitlements
    return entitlements
}
