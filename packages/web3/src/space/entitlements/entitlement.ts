import { type ExtractAbiFunction } from 'abitype'
import { IRuleEntitlementBase, IRuleEntitlementAbi } from './RuleEntitlementShim'
import { IRuleEntitlementV2Base, IRuleEntitlementV2Abi } from './RuleEntitlementV2Shim'
import { dlogger } from '@towns-protocol/utils'

import {
    encodeAbiParameters,
    decodeAbiParameters,
    getAbiItem,
    DecodeFunctionResultReturnType,
    Hex,
} from 'viem'

import { ethers } from 'ethers'
import { Address } from '../../types/ContractTypes'
import { MOCK_ADDRESS } from '../../utils/ut'

const log = dlogger('csb:entitlement')

export type XchainConfig = {
    supportedRpcUrls: { [chainId: number]: string }
    // The chain ids for all supported chains that use ether as the native currency.
    // These chains will be used to determine a user's cumulative ether balance.
    etherNativeNetworkIds: number[]
    // The chain ids for ethereum chains. For towns mainnet, this will include
    // ethereum mainnet only. For test networks, this will also include ethereum
    // sepolia.
    ethereumNetworkIds: number[]
    // Whether to skip fetch setup when creating providers.
    // Required for Cloudflare Workers where ethers.js's default fetch setup
    // conflicts with the Worker's native fetch implementation.
    skipFetchSetup?: boolean
}

const zeroAddress = ethers.constants.AddressZero

export type RuleData = DecodeFunctionResultReturnType<typeof IRuleEntitlementAbi, 'getRuleData'>
export type RuleDataV2 = DecodeFunctionResultReturnType<
    typeof IRuleEntitlementV2Abi,
    'getRuleDataV2'
>

export enum OperationType {
    NONE = 0,
    CHECK,
    LOGICAL,
}

export enum CheckOperationType {
    NONE = 0,
    MOCK,
    ERC20,
    ERC721,
    ERC1155,
    ISENTITLED,
    ETH_BALANCE,
}

function checkOpString(operation: CheckOperationType): string {
    switch (operation) {
        case CheckOperationType.NONE:
            return 'NONE'
        case CheckOperationType.MOCK:
            return 'MOCK'
        case CheckOperationType.ERC20:
            return 'ERC20'
        case CheckOperationType.ERC721:
            return 'ERC721'
        case CheckOperationType.ERC1155:
            return 'ERC1155'
        case CheckOperationType.ISENTITLED:
            return 'ISENTITLED'
        case CheckOperationType.ETH_BALANCE:
            return 'ETH_BALANCE'
        default:
            return 'UNKNOWN'
    }
}

// Enum for Operation oneof operation_clause
export enum LogicalOperationType {
    NONE = 0,
    AND,
    OR,
}
export type ContractOperation = {
    opType: OperationType
    index: number
}

export type ContractLogicalOperation = {
    logOpType: LogicalOperationType
    leftOperationIndex: number
    rightOperationIndex: number
}

export function isContractLogicalOperation(operation: ContractOperation) {
    return operation.opType === OperationType.LOGICAL
}

export type CheckOperation = {
    opType: OperationType.CHECK
    checkType: CheckOperationType
    chainId: bigint
    contractAddress: Address
    threshold: bigint
}
export type CheckOperationV2 = {
    opType: OperationType.CHECK
    checkType: CheckOperationType
    chainId: bigint
    contractAddress: Address
    params: Hex
}

export type OrOperation = {
    opType: OperationType.LOGICAL
    logicalType: LogicalOperationType.OR
    leftOperation: Operation
    rightOperation: Operation
}

export type AndOperation = {
    opType: OperationType.LOGICAL
    logicalType: LogicalOperationType.AND
    leftOperation: Operation
    rightOperation: Operation
}

export type NoOperation = {
    opType: OperationType.NONE
    index: number
}

export const NoopOperation: NoOperation = {
    opType: OperationType.NONE,
    index: 0,
}

export const NoopRuleData = {
    operations: [],
    checkOperations: [],
    logicalOperations: [],
}

export const EncodedNoopRuleData = encodeRuleDataV2(NoopRuleData)

type EntitledWalletOrZeroAddress = string

export type LogicalOperation = OrOperation | AndOperation
export type SupportedLogicalOperationType = LogicalOperation['logicalType']

export type Operation = CheckOperationV2 | OrOperation | AndOperation | NoOperation

function isCheckOperationV2(operation: Operation): operation is CheckOperationV2 {
    return operation.opType === OperationType.CHECK
}

function isLogicalOperation(operation: Operation): operation is LogicalOperation {
    return operation.opType === OperationType.LOGICAL
}

function isAndOperation(operation: LogicalOperation): operation is AndOperation {
    return operation.logicalType === LogicalOperationType.AND
}

function isOrOperation(operation: LogicalOperation): operation is OrOperation {
    return operation.logicalType === LogicalOperationType.OR
}

export function postOrderArrayToTree(operations: Operation[]): Operation {
    const stack: Operation[] = []

    operations.forEach((op) => {
        if (isLogicalOperation(op)) {
            if (stack.length < 2) {
                throw new Error('Invalid post-order array, missing operations')
            }

            // Pop the two most recent operations from the stack
            const right = stack.pop()
            const left = stack.pop()

            // Ensure the operations exist
            if (!left || !right) {
                throw new Error('Invalid post-order array, missing operations')
            }

            // Update the current logical operation's children
            if (isLogicalOperation(op)) {
                op.leftOperation = left
                op.rightOperation = right
            }
        }

        // Push the current operation back into the stack
        stack.push(op)
    })

    // The last item in the stack is the root of the tree
    const root = stack.pop()
    if (!root) {
        throw new Error('Invalid post-order array')
    }

    return root
}

export type ThresholdParams = {
    threshold: bigint
}

const thresholdParamsAbi = {
    components: [
        {
            name: 'threshold',
            type: 'uint256',
        },
    ],
    name: 'thresholdParams',
    type: 'tuple',
} as const

export function encodeThresholdParams(params: ThresholdParams): Hex {
    if (params.threshold < 0n) {
        throw new Error(`Invalid threshold ${params.threshold}: must be greater than or equal to 0`)
    }
    return encodeAbiParameters([thresholdParamsAbi], [params])
}

export function decodeThresholdParams(params: Hex): Readonly<ThresholdParams> {
    return decodeAbiParameters([thresholdParamsAbi], params)[0]
}

export type ERC1155Params = {
    threshold: bigint
    tokenId: bigint
}

const erc1155ParamsAbi = {
    components: [
        {
            name: 'threshold',
            type: 'uint256',
        },
        {
            name: 'tokenId',
            type: 'uint256',
        },
    ],
    name: 'erc1155Params',
    type: 'tuple',
} as const
export function encodeERC1155Params(params: ERC1155Params): Hex {
    if (params.threshold < 0n) {
        throw new Error(`Invalid threshold ${params.threshold}: must be greater than or equal to 0`)
    }
    if (params.tokenId < 0n) {
        throw new Error(`Invalid tokenId ${params.tokenId}: must be greater than or equal to 0`)
    }
    return encodeAbiParameters([erc1155ParamsAbi], [params])
}

export function decodeERC1155Params(params: Hex): Readonly<ERC1155Params> {
    return decodeAbiParameters([erc1155ParamsAbi], params)[0]
}

export function encodeRuleData(ruleData: IRuleEntitlementBase.RuleDataStruct): Hex {
    const encodeRuleDataAbi: ExtractAbiFunction<typeof IRuleEntitlementAbi, 'encodeRuleData'> =
        getAbiItem({
            abi: IRuleEntitlementAbi,
            name: 'encodeRuleData',
        })

    if (!encodeRuleDataAbi) {
        throw new Error('encodeRuleData ABI not found')
    }
    // @ts-ignore
    return encodeAbiParameters(encodeRuleDataAbi.inputs, [ruleData])
}

export function decodeRuleData(entitlementData: Hex): IRuleEntitlementBase.RuleDataStruct {
    const getRuleDataAbi: ExtractAbiFunction<typeof IRuleEntitlementAbi, 'getRuleData'> =
        getAbiItem({
            abi: IRuleEntitlementAbi,
            name: 'getRuleData',
        })

    if (!getRuleDataAbi) {
        throw new Error('getRuleData ABI not found')
    }
    const decoded = decodeAbiParameters(
        getRuleDataAbi.outputs,
        entitlementData,
    ) as unknown as IRuleEntitlementBase.RuleDataStruct[]
    return decoded[0]
}

export function encodeRuleDataV2(ruleData: IRuleEntitlementV2Base.RuleDataV2Struct): Hex {
    // If we encounter a no-op rule data, just encode as empty bytes.
    if (ruleData.operations.length === 0) {
        return '0x'
    }

    const getRuleDataV2Abi: ExtractAbiFunction<typeof IRuleEntitlementV2Abi, 'getRuleDataV2'> =
        getAbiItem({
            abi: IRuleEntitlementV2Abi,
            name: 'getRuleDataV2',
        })

    if (!getRuleDataV2Abi) {
        throw new Error('encodeRuleDataV2 ABI not found')
    }
    // @ts-ignore
    return encodeAbiParameters(getRuleDataV2Abi.outputs, [ruleData])
}

export function decodeRuleDataV2(entitlementData: Hex): IRuleEntitlementV2Base.RuleDataV2Struct {
    if (entitlementData === '0x') {
        return {
            operations: [],
            checkOperations: [],
            logicalOperations: [],
        } as IRuleEntitlementV2Base.RuleDataV2Struct
    }

    const getRuleDataV2Abi: ExtractAbiFunction<typeof IRuleEntitlementV2Abi, 'getRuleDataV2'> =
        getAbiItem({
            abi: IRuleEntitlementV2Abi,
            name: 'getRuleDataV2',
        })

    if (!getRuleDataV2Abi) {
        throw new Error('encodeRuleDataV2 ABI not found')
    }
    // @ts-ignore
    const decoded = decodeAbiParameters(
        getRuleDataV2Abi.outputs,
        entitlementData,
    ) as unknown as IRuleEntitlementV2Base.RuleDataV2Struct[]
    return decoded[0]
}

export function ruleDataToOperations(data: IRuleEntitlementV2Base.RuleDataV2Struct): Operation[] {
    const decodedOperations: Operation[] = []
    const roData = data as RuleDataV2

    roData.operations.forEach((operation) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (operation.opType === OperationType.CHECK) {
            const checkOperation = roData.checkOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.CHECK,
                checkType: checkOperation.opType,
                chainId: checkOperation.chainId,
                contractAddress: checkOperation.contractAddress,
                params: checkOperation.params,
            })
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        else if (operation.opType === OperationType.LOGICAL) {
            const logicalOperation = roData.logicalOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.LOGICAL,
                logicalType: logicalOperation.logOpType,
                leftOperation: decodedOperations[logicalOperation.leftOperationIndex],
                rightOperation: decodedOperations[logicalOperation.rightOperationIndex],
            } satisfies LogicalOperation)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        } else if (operation.opType === OperationType.NONE) {
            decodedOperations.push(NoopOperation)
        } else {
            throw new Error(`Unknown logical operation type ${operation.opType}`)
        }
    })
    return decodedOperations
}

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

export function postOrderTraversal(operation: Operation, data: DeepWriteable<RuleDataV2>) {
    if (isLogicalOperation(operation)) {
        postOrderTraversal(operation.leftOperation, data)
        // Capture index of the most recently added operation, which is the
        // top of the left child's postorder tree
        const leftChildIndex = data.operations.length - 1
        postOrderTraversal(operation.rightOperation, data)
        data.logicalOperations.push({
            logOpType: operation.logicalType,
            leftOperationIndex: leftChildIndex,
            rightOperationIndex: data.operations.length - 1, // Index of right child root
        })
        data.operations.push({
            opType: OperationType.LOGICAL,
            index: data.logicalOperations.length - 1,
        })
    } else if (isCheckOperationV2(operation)) {
        data.checkOperations.push({
            opType: operation.checkType,
            chainId: operation.chainId,
            contractAddress: operation.contractAddress,
            params: operation.params,
        })
        data.operations.push({
            opType: OperationType.CHECK,
            index: data.checkOperations.length - 1,
        })
    } else {
        throw new Error('Unrecognized operation type')
    }
}

export function treeToRuleData(root: Operation): IRuleEntitlementV2Base.RuleDataV2Struct {
    const data = {
        operations: [],
        checkOperations: [],
        logicalOperations: [],
    }
    postOrderTraversal(root, data)

    return data
}

/**
 * Evaluates an AndOperation
 * If either of the operations are false, the entire operation is false, and the
 * other operation is aborted. Once both operations succeed, the entire operation
 * succeeds.
 * @param operation
 * @param controller
 * @returns true once both succeed, false if either fail
 */
async function evaluateAndOperation(
    controller: AbortController,
    linkedWallets: string[],
    xchainConfig: XchainConfig,
    operation?: AndOperation,
): Promise<EntitledWalletOrZeroAddress> {
    if (!operation?.leftOperation || !operation?.rightOperation) {
        controller.abort()
        return zeroAddress
    }
    const newController = new AbortController()
    controller.signal.addEventListener('abort', () => {
        newController.abort()
    })
    const interuptFlag = {} as const
    let tempInterupt: (
        value: typeof interuptFlag | PromiseLike<typeof interuptFlag>,
    ) => void | undefined
    const interupted = new Promise<typeof interuptFlag>((resolve) => {
        tempInterupt = resolve
    })

    const interupt = () => {
        if (tempInterupt) {
            tempInterupt(interuptFlag)
        }
    }

    async function racer(operationEntry: Operation): Promise<EntitledWalletOrZeroAddress> {
        const result = await Promise.race([
            evaluateTree(newController, linkedWallets, xchainConfig, operationEntry),
            interupted,
        ])
        if (result === interuptFlag) {
            return zeroAddress // interupted
        } else if (isValidAddress(result)) {
            return result
        } else {
            controller.abort()
            interupt()
            return zeroAddress
        }
    }

    const checks = await Promise.all([
        racer(operation.leftOperation),
        racer(operation.rightOperation),
    ])
    const result = checks.every((res) => isValidAddress(res))

    if (!result) {
        return zeroAddress
    }

    return checks[0]
}

/**
 * Evaluates an OrOperation
 * If either of the operations are true, the entire operation is true
 * and the other operation is aborted. Once both operationd fail, the
 * entire operation fails.
 * @param operation
 * @param signal
 * @returns true once one succeeds, false if both fail
 */
async function evaluateOrOperation(
    controller: AbortController,
    linkedWallets: string[],
    xchainConfig: XchainConfig,
    operation?: OrOperation,
): Promise<EntitledWalletOrZeroAddress> {
    if (!operation?.leftOperation || !operation?.rightOperation) {
        controller.abort()
        return zeroAddress
    }
    const newController = new AbortController()
    controller.signal.addEventListener('abort', () => {
        newController.abort()
    })

    const interuptFlag = {} as const
    let tempInterupt: (
        value: typeof interuptFlag | PromiseLike<typeof interuptFlag>,
    ) => void | undefined
    const interupted = new Promise<typeof interuptFlag>((resolve) => {
        tempInterupt = resolve
    })

    const interupt = () => {
        if (tempInterupt) {
            tempInterupt(interuptFlag)
        }
    }

    async function racer(operation: Operation): Promise<EntitledWalletOrZeroAddress> {
        const result = await Promise.race([
            evaluateTree(newController, linkedWallets, xchainConfig, operation),
            interupted,
        ])
        if (result === interuptFlag) {
            return zeroAddress // interupted, the other must have returned true
        } else if (isValidAddress(result)) {
            // cancel the other operation
            newController.abort()
            interupt()
            return result
        } else {
            return zeroAddress
        }
    }

    const checks = await Promise.all([
        racer(operation.leftOperation),
        racer(operation.rightOperation),
    ])
    const result = checks.find((res) => isValidAddress(res))
    return result ?? ethers.constants.AddressZero
}

/**
 * Evaluates a CheckOperation
 * Mekes the smart contract call. Will be aborted if another branch invalidates
 * the need to make the check.
 * @param operation
 * @param signal
 * @returns
 */
async function evaluateCheckOperation(
    controller: AbortController,
    linkedWallets: string[],
    xchainConfig: XchainConfig,
    operation?: CheckOperationV2,
): Promise<EntitledWalletOrZeroAddress> {
    if (!operation) {
        controller.abort()
        return zeroAddress
    }

    switch (operation.checkType) {
        case CheckOperationType.MOCK: {
            return evaluateMockOperation(operation, controller)
        }
        case CheckOperationType.NONE:
            throw new Error('Unknown check operation type')
        default:
    }

    if (operation.checkType !== CheckOperationType.ETH_BALANCE && operation.chainId < 0n) {
        throw new Error(
            `Invalid chain id for check operation ${checkOpString(operation.checkType)}`,
        )
    }

    if (
        operation.checkType !== CheckOperationType.ETH_BALANCE &&
        operation.contractAddress === zeroAddress
    ) {
        throw new Error(
            `Invalid contract address for check operation ${checkOpString(operation.checkType)}`,
        )
    }

    if (
        [
            CheckOperationType.ERC20,
            CheckOperationType.ERC721,
            CheckOperationType.ETH_BALANCE,
        ].includes(operation.checkType)
    ) {
        const { threshold } = decodeThresholdParams(operation.params)
        if (threshold <= 0n) {
            throw new Error(
                `Invalid threshold for check operation ${checkOpString(operation.checkType)}`,
            )
        }
    } else if (operation.checkType === CheckOperationType.ERC1155) {
        const { tokenId, threshold } = decodeERC1155Params(operation.params)
        if (tokenId < 0n) {
            throw new Error(
                `Invalid token id for check operation ${checkOpString(operation.checkType)}`,
            )
        }
        if (threshold <= 0n) {
            throw new Error(
                `Invalid threshold for check operation ${checkOpString(operation.checkType)}`,
            )
        }
    }

    switch (operation.checkType) {
        case CheckOperationType.ISENTITLED: {
            const provider = await findProviderFromChainId(xchainConfig, operation.chainId)

            if (!provider) {
                controller.abort()
                return zeroAddress
            }
            return evaluateCrossChainEntitlementOperation(
                operation,
                controller,
                provider,
                linkedWallets,
            )
        }
        case CheckOperationType.ETH_BALANCE: {
            const etherChainProviders = await findEtherChainProviders(xchainConfig)

            if (!etherChainProviders.length) {
                controller.abort()
                return zeroAddress
            }

            return evaluateEthBalanceOperation(
                operation,
                controller,
                etherChainProviders,
                linkedWallets,
            )
        }
        case CheckOperationType.ERC1155: {
            const provider = await findProviderFromChainId(xchainConfig, operation.chainId)

            if (!provider) {
                controller.abort()
                return zeroAddress
            }
            return evaluateERC1155Operation(operation, controller, provider, linkedWallets)
        }
        case CheckOperationType.ERC20: {
            const provider = await findProviderFromChainId(xchainConfig, operation.chainId)

            if (!provider) {
                controller.abort()
                return zeroAddress
            }
            return evaluateERC20Operation(operation, controller, provider, linkedWallets)
        }
        case CheckOperationType.ERC721: {
            const provider = await findProviderFromChainId(xchainConfig, operation.chainId)

            if (!provider) {
                controller.abort()
                return zeroAddress
            }

            return evaluateERC721Operation(operation, controller, provider, linkedWallets)
        }
        default:
            throw new Error('Unknown check operation type')
    }
}

/**
 *
 * @param operations
 * @param linkedWallets
 * @param providers
 * @returns An entitled wallet or the zero address, indicating no entitlement
 */
export async function evaluateOperationsForEntitledWallet(
    operations: Operation[],
    linkedWallets: string[],
    xchainConfig: XchainConfig,
) {
    if (operations.length === 0) {
        return zeroAddress
    }
    const controller = new AbortController()
    const root = postOrderArrayToTree(operations)
    const result = evaluateTree(controller, linkedWallets, xchainConfig, root)
    controller.abort()
    return result
}

export async function evaluateTree(
    controller: AbortController,
    linkedWallets: string[],
    xchainConfig: XchainConfig,
    entry?: Operation,
): Promise<EntitledWalletOrZeroAddress> {
    if (!entry) {
        controller.abort()
        return zeroAddress
    }
    const newController = new AbortController()
    controller.signal.addEventListener('abort', () => {
        newController.abort()
    })

    if (isLogicalOperation(entry)) {
        if (isAndOperation(entry)) {
            return evaluateAndOperation(newController, linkedWallets, xchainConfig, entry)
        } else if (isOrOperation(entry)) {
            return evaluateOrOperation(newController, linkedWallets, xchainConfig, entry)
        } else {
            throw new Error('Unknown operation type')
        }
    } else if (isCheckOperationV2(entry)) {
        return evaluateCheckOperation(newController, linkedWallets, xchainConfig, entry)
    } else {
        throw new Error('Unknown operation type')
    }
}

// These two methods are used to create a rule data struct for an external token or NFT
// checks for testing.
export function createExternalTokenStruct(
    addresses: Address[],
    options?: {
        checkOptions?: Partial<Omit<DecodedCheckOperation, 'address'>>
        logicalOp?: SupportedLogicalOperationType
    },
) {
    if (addresses.length === 0) {
        return NoopRuleData
    }
    const defaultChain = addresses.map((address) => ({
        chainId: options?.checkOptions?.chainId ?? 1n,
        address: address,
        type: options?.checkOptions?.type ?? (CheckOperationType.ERC20 as const),
        params: encodeThresholdParams({ threshold: options?.checkOptions?.threshold ?? BigInt(1) }),
    }))
    return createOperationsTree(defaultChain, options?.logicalOp ?? LogicalOperationType.OR)
}

export function createExternalNFTStruct(
    addresses: Address[],
    options?: {
        checkOptions?: Partial<Omit<DecodedCheckOperation, 'address'>>
        logicalOp?: SupportedLogicalOperationType
    },
) {
    if (addresses.length === 0) {
        return NoopRuleData
    }
    const defaultChain = addresses.map((address) => ({
        // Anvil chain id
        chainId: options?.checkOptions?.chainId ?? 31337n,
        address: address,
        type: options?.checkOptions?.type ?? (CheckOperationType.ERC721 as const),
        params: encodeThresholdParams({ threshold: options?.checkOptions?.threshold ?? BigInt(1) }),
    }))
    return createOperationsTree(defaultChain, options?.logicalOp ?? LogicalOperationType.OR)
}

export class DecodedCheckOperationBuilder {
    private decodedCheckOp: Partial<DecodedCheckOperation> = {}

    public setType(checkOpType: CheckOperationType): this {
        this.decodedCheckOp.type = checkOpType
        return this
    }

    public setChainId(chainId: bigint): this {
        this.decodedCheckOp.chainId = chainId
        return this
    }

    public setThreshold(threshold: bigint): this {
        this.decodedCheckOp.threshold = threshold
        return this
    }

    public setAddress(address: Address): this {
        this.decodedCheckOp.address = address
        return this
    }

    public setTokenId(tokenId: bigint): this {
        this.decodedCheckOp.tokenId = tokenId
        return this
    }

    public setByteEncodedParams(params: Hex): this {
        this.decodedCheckOp.byteEncodedParams = params
        return this
    }

    public build(): DecodedCheckOperation {
        if (this.decodedCheckOp.type === undefined) {
            throw new Error('DecodedCheckOperation requires a type')
        }

        const opStr = checkOpString(this.decodedCheckOp.type)

        // For contract-related checks, assert set values for chain id and contract address
        switch (this.decodedCheckOp.type) {
            case CheckOperationType.ERC1155:
            case CheckOperationType.ERC20:
            case CheckOperationType.ERC721:
            case CheckOperationType.ISENTITLED:
                if (this.decodedCheckOp.chainId === undefined) {
                    throw new Error(`DecodedCheckOperation of type ${opStr} requires a chainId`)
                }
                if (this.decodedCheckOp.address === undefined) {
                    throw new Error(`DecodedCheckOperation of type ${opStr} requires an address`)
                }
        }

        // threshold check
        switch (this.decodedCheckOp.type) {
            case CheckOperationType.ERC1155:
            case CheckOperationType.ETH_BALANCE:
            case CheckOperationType.ERC20:
            case CheckOperationType.ERC721:
                if (this.decodedCheckOp.threshold === undefined) {
                    throw new Error(`DecodedCheckOperation of type ${opStr} requires a threshold`)
                }
        }

        // tokenId check
        if (
            this.decodedCheckOp.type === CheckOperationType.ERC1155 &&
            this.decodedCheckOp.tokenId === undefined
        ) {
            throw new Error(`DecodedCheckOperation of type ${opStr} requires a tokenId`)
        }

        // byte-encoded params check
        if (
            this.decodedCheckOp.type === CheckOperationType.ISENTITLED &&
            this.decodedCheckOp.byteEncodedParams === undefined
        ) {
            throw new Error(`DecodedCheckOperation of type ${opStr} requires byteEncodedParams`)
        }

        switch (this.decodedCheckOp.type) {
            case CheckOperationType.ERC20:
            case CheckOperationType.ERC721:
                return {
                    type: this.decodedCheckOp.type,
                    chainId: this.decodedCheckOp.chainId!,
                    address: this.decodedCheckOp.address!,
                    threshold: this.decodedCheckOp.threshold!,
                }

            case CheckOperationType.ERC1155:
                return {
                    type: CheckOperationType.ERC1155,
                    chainId: this.decodedCheckOp.chainId!,
                    address: this.decodedCheckOp.address!,
                    threshold: this.decodedCheckOp.threshold!,
                    tokenId: this.decodedCheckOp.tokenId!,
                }

            case CheckOperationType.ETH_BALANCE:
                return {
                    type: CheckOperationType.ETH_BALANCE,
                    threshold: this.decodedCheckOp.threshold!,
                }

            case CheckOperationType.ISENTITLED:
                return {
                    type: CheckOperationType.ISENTITLED,
                    address: this.decodedCheckOp.address!,
                    chainId: this.decodedCheckOp.chainId!,
                    byteEncodedParams: this.decodedCheckOp.byteEncodedParams!,
                }

            default:
                throw new Error(
                    `Check operation type ${opStr} unrecognized or not used in production`,
                )
        }
    }
}

export type DecodedCheckOperation = {
    type: CheckOperationType
    chainId?: bigint
    address?: Address
    threshold?: bigint
    tokenId?: bigint
    byteEncodedParams?: Hex
}

export function createOperationsTree(
    checkOp: DecodedCheckOperation[],
    logicalOp: SupportedLogicalOperationType = LogicalOperationType.OR,
): IRuleEntitlementV2Base.RuleDataV2Struct {
    if (checkOp.length === 0) {
        return {
            operations: [NoopOperation],
            checkOperations: [],
            logicalOperations: [],
        }
    }

    let operations: Operation[] = checkOp.map((op) => {
        let params: Hex
        switch (op.type) {
            case CheckOperationType.ERC20:
            case CheckOperationType.ERC721:
                params = encodeThresholdParams({ threshold: op.threshold ?? BigInt(1) })
                break
            case CheckOperationType.ETH_BALANCE:
                params = encodeThresholdParams({ threshold: op.threshold ?? BigInt(0) })
                break
            case CheckOperationType.ERC1155:
                params = encodeERC1155Params({
                    threshold: op.threshold ?? BigInt(1),
                    tokenId: op.tokenId ?? BigInt(0),
                })
                break
            case CheckOperationType.ISENTITLED:
                params = op.byteEncodedParams ?? `0x`
                break
            default:
                params = '0x'
        }

        return {
            opType: OperationType.CHECK,
            checkType: op.type,
            chainId: op.chainId ?? 1n,
            contractAddress: op.address ?? zeroAddress,
            params,
        }
    })

    while (operations.length > 1) {
        const newOperations: Operation[] = []
        for (let i = 0; i < operations.length; i += 2) {
            if (i + 1 < operations.length) {
                newOperations.push({
                    opType: OperationType.LOGICAL,
                    logicalType: logicalOp,
                    leftOperation: operations[i],
                    rightOperation: operations[i + 1],
                })
            } else {
                newOperations.push(operations[i]) // Odd one out, just push it to the next level
            }
        }
        operations = newOperations
    }

    return treeToRuleData(operations[0])
}

// Return a set of reified check operations from a rule data struct in order to easily evaluate
// thresholds, convert check operations into token schemas, etc.
export function createDecodedCheckOperationFromTree(
    entitlementData: IRuleEntitlementV2Base.RuleDataV2Struct,
): DecodedCheckOperation[] {
    const operations = ruleDataToOperations(entitlementData)
    const checkOpSubsets: DecodedCheckOperation[] = []
    operations.forEach((operation) => {
        if (isCheckOperationV2(operation)) {
            const op = {
                address: operation.contractAddress,
                chainId: operation.chainId,
                type: operation.checkType,
            }
            if (operation.checkType === CheckOperationType.ERC1155) {
                const { threshold, tokenId } = decodeERC1155Params(operation.params)
                checkOpSubsets.push({
                    ...op,
                    threshold,
                    tokenId,
                })
            } else if (
                operation.checkType === CheckOperationType.ERC20 ||
                operation.checkType === CheckOperationType.ERC721 ||
                operation.checkType === CheckOperationType.ETH_BALANCE
            ) {
                const { threshold } = decodeThresholdParams(operation.params)
                checkOpSubsets.push({
                    ...op,
                    threshold,
                })
            } else if (operation.checkType === CheckOperationType.ISENTITLED) {
                checkOpSubsets.push({
                    ...op,
                    byteEncodedParams: operation.params,
                })
            }
        }
    })
    return checkOpSubsets
}

async function evaluateMockOperation(
    operation: CheckOperationV2,
    controller: AbortController,
): Promise<EntitledWalletOrZeroAddress> {
    const result = operation.chainId === 1n
    const { threshold } = decodeThresholdParams(operation.params)
    const delay = Number.parseInt(threshold.toString())

    return await new Promise((resolve) => {
        controller.signal.onabort = () => {
            if (timeout) {
                clearTimeout(timeout)
                resolve(zeroAddress)
            }
        }

        const timeout = setTimeout(() => {
            if (result) {
                resolve(MOCK_ADDRESS)
            } else {
                resolve(zeroAddress)
            }
        }, delay)
    })
}

async function evaluateERC721Operation(
    operation: CheckOperationV2,
    controller: AbortController,
    provider: ethers.providers.BaseProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const { threshold } = decodeThresholdParams(operation.params)
    return evaluateContractBalanceAcrossWallets(
        operation.contractAddress,
        threshold,
        controller,
        provider,
        linkedWallets,
    )
}

async function evaluateERC20Operation(
    operation: CheckOperationV2,
    controller: AbortController,
    provider: ethers.providers.BaseProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const { threshold } = decodeThresholdParams(operation.params)
    return evaluateContractBalanceAcrossWallets(
        operation.contractAddress,
        threshold,
        controller,
        provider,
        linkedWallets,
    )
}

async function evaluateCrossChainEntitlementOperation(
    operation: CheckOperationV2,
    controller: AbortController,
    provider: ethers.providers.BaseProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const contract = new ethers.Contract(
        operation.contractAddress,
        ['function isEntitled(address[], bytes) view returns (bool)'],
        provider,
    )
    return await Promise.any(
        linkedWallets.map(async (wallet): Promise<Address> => {
            const isEntitled = await contract.callStatic.isEntitled([wallet], operation.params)
            if (isEntitled === true) {
                return wallet as Address
            }
            throw new Error('Not entitled')
        }),
    ).catch(() => {
        controller.abort()
        return zeroAddress
    })
}

async function evaluateERC1155Operation(
    operation: CheckOperationV2,
    controller: AbortController,
    provider: ethers.providers.BaseProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const contract = new ethers.Contract(
        operation.contractAddress,
        ['function balanceOf(address, uint256) view returns (uint)'],
        provider,
    )

    const { threshold, tokenId } = decodeERC1155Params(operation.params)

    const walletBalances = await Promise.all(
        linkedWallets.map(async (wallet) => {
            try {
                const result = (await contract.callStatic.balanceOf(
                    wallet,
                    tokenId,
                )) as ethers.BigNumberish
                const resultAsBigNumber = ethers.BigNumber.from(result)
                return {
                    wallet,
                    balance: resultAsBigNumber,
                }
            } catch (error) {
                return {
                    wallet,
                    balance: ethers.BigNumber.from(0),
                }
            }
        }),
    )

    const walletsWithAsset = walletBalances.filter((result) => result.balance.gt(0))

    const accumulatedBalance = walletsWithAsset.reduce(
        (acc, el) => acc.add(el.balance),
        ethers.BigNumber.from(0),
    )

    if (walletsWithAsset.length > 0 && accumulatedBalance.gte(threshold)) {
        return walletsWithAsset[0].wallet
    } else {
        controller.abort()
        return zeroAddress
    }
}

async function getEthBalance(
    provider: ethers.providers.BaseProvider,
    wallet: string,
): Promise<{ wallet: string; balance: ethers.BigNumber }> {
    try {
        const balance = await provider.getBalance(wallet)
        return {
            wallet,
            balance,
        }
    } catch (error) {
        return {
            wallet,
            balance: ethers.BigNumber.from(0),
        }
    }
}

async function evaluateEthBalanceOperation(
    operation: CheckOperationV2,
    controller: AbortController,
    providers: ethers.providers.BaseProvider[],
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const { threshold } = decodeThresholdParams(operation.params)

    const balancePromises: Promise<{ wallet: string; balance: ethers.BigNumber }>[] = []
    for (const wallet of linkedWallets) {
        for (const provider of providers) {
            balancePromises.push(getEthBalance(provider, wallet))
        }
    }
    const walletBalances = await Promise.all(balancePromises)

    const walletsWithAsset = walletBalances.filter((balance) => balance.balance.gt(0))
    const accumulatedBalance = walletsWithAsset.reduce(
        (acc, el) => acc.add(el.balance),
        ethers.BigNumber.from(0),
    )

    if (walletsWithAsset.length > 0 && accumulatedBalance.gte(threshold)) {
        return walletsWithAsset[0].wallet
    } else {
        controller.abort()
        return zeroAddress
    }
}

async function evaluateContractBalanceAcrossWallets(
    contractAddress: Address,
    threshold: bigint,
    controller: AbortController,
    provider: ethers.providers.BaseProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const contract = new ethers.Contract(
        contractAddress,
        ['function balanceOf(address) view returns (uint)'],
        provider,
    )

    const walletBalances = await Promise.all(
        linkedWallets.map(async (wallet) => {
            try {
                const result: ethers.BigNumberish = await contract.callStatic.balanceOf(wallet)
                const resultAsBigNumber = ethers.BigNumber.from(result)
                if (!ethers.BigNumber.isBigNumber(resultAsBigNumber)) {
                    return {
                        wallet,
                        balance: ethers.BigNumber.from(0),
                    }
                }
                return {
                    wallet,
                    balance: resultAsBigNumber,
                }
            } catch (error) {
                return {
                    wallet,
                    balance: ethers.BigNumber.from(0),
                }
            }
        }),
    )

    const walletsWithAsset = walletBalances.filter((balance) => balance.balance.gt(0))

    const accumulatedBalance = walletsWithAsset.reduce(
        (acc, el) => acc.add(el.balance),
        ethers.BigNumber.from(0),
    )

    if (walletsWithAsset.length > 0 && accumulatedBalance.gte(threshold)) {
        return walletsWithAsset[0].wallet
    } else {
        controller.abort()
        return zeroAddress
    }
}

async function findProviderFromChainId(xchainConfig: XchainConfig, chainId: bigint) {
    if (!(Number(chainId) in xchainConfig.supportedRpcUrls)) {
        return undefined
    }

    const url = xchainConfig.supportedRpcUrls[Number(chainId)]
    const provider = new ethers.providers.StaticJsonRpcProvider({
        url,
        skipFetchSetup: xchainConfig.skipFetchSetup === true,
    })
    await provider.ready
    return provider
}

async function findEtherChainProviders(xchainConfig: XchainConfig) {
    const etherChainProviders = []
    for (const chainId of xchainConfig.etherNativeNetworkIds) {
        if (!(chainId in xchainConfig.supportedRpcUrls)) {
            log.info(`(WARN) findEtherChainProviders: No supported RPC URL for chain id ${chainId}`)
        } else {
            const url = xchainConfig.supportedRpcUrls[chainId]
            etherChainProviders.push(
                new ethers.providers.StaticJsonRpcProvider({
                    url,
                    skipFetchSetup: xchainConfig.skipFetchSetup === true,
                }),
            )
        }
    }
    await Promise.all(etherChainProviders.map((p) => p.ready))
    return etherChainProviders
}

export async function findEthereumProviders(xchainConfig: XchainConfig) {
    const ethereumProviders = []
    for (const chainId of xchainConfig.ethereumNetworkIds) {
        if (!(chainId in xchainConfig.supportedRpcUrls)) {
            log.error(`findEthereumProviders: No supported RPC URL for chain id ${chainId}`)
        } else {
            const url = xchainConfig.supportedRpcUrls[chainId]
            ethereumProviders.push(
                new ethers.providers.StaticJsonRpcProvider({
                    url,
                    skipFetchSetup: xchainConfig.skipFetchSetup === true,
                }),
            )
        }
    }
    await Promise.all(ethereumProviders.map((p) => p.ready))
    return ethereumProviders
}

function isValidAddress(value: unknown): value is Address {
    return (
        typeof value === 'string' &&
        ethers.utils.isAddress(value) &&
        value !== ethers.constants.AddressZero
    )
}
