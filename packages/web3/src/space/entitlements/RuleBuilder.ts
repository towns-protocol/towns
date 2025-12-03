// Fancy wrapper on top of ./entitlement.ts to enable building rule trees in a friendlier way.
import { zeroAddress, type Address, type Hex } from 'viem'
import {
    CheckOperationType,
    encodeThresholdParams,
    type Operation,
    encodeERC1155Params,
    LogicalOperationType,
    NoopRuleData,
    OperationType,
    treeToRuleData,
    encodeRuleDataV2,
    NoopOperation,
} from './entitlement'

export interface RuleCheckErc20Params {
    chainId: bigint
    contractAddress: Address
    threshold: bigint
}

export interface RuleCheckErc721Params {
    chainId: bigint
    contractAddress: Address
    threshold: bigint
}

export interface RuleCheckErc1155Params {
    chainId: bigint
    contractAddress: Address
    threshold: bigint
    tokenId: bigint
}

// Q: is this xchain compatible? If so, we should optionally support chainId here
export interface RuleCheckEthBalanceParams {
    threshold: bigint
}

export interface RuleCheckIsEntitledParams {
    chainId: bigint
    contractAddress: Address
    params?: Hex
}

/** Check ERC20 token balance */
const checkErc20 = (params: RuleCheckErc20Params) =>
    ({
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC20,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        params: encodeThresholdParams({ threshold: params.threshold }),
    }) satisfies Operation

/** Check ERC721 NFT balance */
const checkErc721 = (params: RuleCheckErc721Params) =>
    ({
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC721,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        params: encodeThresholdParams({ threshold: params.threshold }),
    }) satisfies Operation

/** Check ERC1155 multi-token balance */
const checkErc1155 = (params: RuleCheckErc1155Params) =>
    ({
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ERC1155,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        params: encodeERC1155Params({ threshold: params.threshold, tokenId: params.tokenId }),
    }) satisfies Operation

/** Check native ETH balance across all ether chains */
const checkEthBalance = (params: RuleCheckEthBalanceParams) =>
    ({
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ETH_BALANCE,
        chainId: 0n,
        contractAddress: zeroAddress,
        params: encodeThresholdParams({ threshold: params.threshold }),
    }) satisfies Operation

/** Check cross-chain entitlement */
const checkIsEntitled = (params: RuleCheckIsEntitledParams) =>
    ({
        opType: OperationType.CHECK,
        checkType: CheckOperationType.ISENTITLED,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        params: params.params ?? '0x',
    }) satisfies Operation

/** Combine two rules with AND (both must pass) */
const and = (left: Operation, right: Operation) =>
    ({
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.AND,
        leftOperation: left,
        rightOperation: right,
    }) satisfies Operation

/** Combine two rules with OR (either must pass) */
const or = (left: Operation, right: Operation) =>
    ({
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.OR,
        leftOperation: left,
        rightOperation: right,
    }) satisfies Operation

/** Check if ALL rules pass (variadic `and`) */
const every = (...ops: [Operation, Operation, ...Operation[]]) =>
    ops.slice(2).reduce<Operation>((acc, op) => and(acc, op), and(ops[0], ops[1]))

/** Check if ANY rule passes (variadic `or`) */
const some = (...ops: [Operation, Operation, ...Operation[]]) =>
    ops.slice(2).reduce<Operation>((acc, op) => or(acc, op), or(ops[0], ops[1]))

/** Convert a rule tree to encoded Hex data for smart contracts. */
export const createRule = (operation: Operation): Hex => {
    const ruleData = treeToRuleData(operation)
    return encodeRuleDataV2(ruleData)
}

/** Convert a rule tree to ethers typing IRuleEntitlementBase.RuleDataV2Struct */
export const createRuleStruct = (operation: Operation) => {
    if (operation.opType === OperationType.NONE) {
        return NoopRuleData
    }
    return treeToRuleData(operation)
}

export const Rules = {
    and,
    or,
    checkErc1155,
    checkErc20,
    checkErc721,
    checkEthBalance,
    checkIsEntitled,
    every,
    some,
    noop: NoopOperation,
}
