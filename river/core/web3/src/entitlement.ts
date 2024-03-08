import type { AbiParameter, AbiFunction } from 'abitype'
import { IRuleEntitlement, IRuleEntitlementAbi } from './v3/IRuleEntitlementShim'

import {
    createPublicClient,
    http,
    decodeAbiParameters,
    encodeAbiParameters,
    PublicClient,
} from 'viem'

import { mainnet } from 'viem/chains'

type ReadContractFunction = typeof publicClient.readContract<
    typeof IRuleEntitlementAbi,
    'getRuleData'
>
type ReadContractReturnType = ReturnType<ReadContractFunction>
export type RuleData = Awaited<ReadContractReturnType>

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
    contractAddress: `0x${string}`
    threshold: bigint
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
    operations: [NoopOperation],
    checkOperations: [],
    logicalOperations: [],
}

export type LogicalOperation = OrOperation | AndOperation
export type Operation = CheckOperation | OrOperation | AndOperation | NoOperation

function isCheckOperation(operation: Operation): operation is CheckOperation {
    return operation.opType === OperationType.CHECK
}

function isLogicalOperation(operation: Operation): operation is LogicalOperation {
    return operation.opType === OperationType.LOGICAL
}

function isAndOperation(operation: LogicalOperation): operation is AndOperation {
    return operation.logicalType === LogicalOperationType.AND
}

const publicClient: PublicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
})

function isOrOperation(operation: LogicalOperation): operation is OrOperation {
    return operation.logicalType === LogicalOperationType.OR
}

export function postOrderArrayToTree(operations: Operation[]) {
    const stack: Operation[] = []

    operations.forEach((op) => {
        if (isLogicalOperation(op)) {
            // Pop the two most recent operations from the stack
            const right = stack.pop()
            const left = stack.pop()

            // Ensure the operations exist
            if (!left || !right) {
                throw new Error('Invalid post-order array')
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

export const getOperationTree = async (
    address: `0x${string}`,
    roleId: bigint,
): Promise<Operation> => {
    const entitlementData = await publicClient.readContract({
        address: address,
        abi: IRuleEntitlementAbi,
        functionName: 'getEntitlementDataByRoleId',
        args: [roleId],
    })

    const data = decodeEntitlementData(entitlementData)

    const operations = ruleDataToOperations(data)

    return postOrderArrayToTree(operations)
}

const setRuleDataInputs: readonly AbiParameter[] | undefined = (
    Object.values(IRuleEntitlementAbi).find((abi) => abi.name === 'setRuleData') as
        | AbiFunction
        | undefined
)?.inputs

export function encodeEntitlementData(ruleData: IRuleEntitlement.RuleDataStruct): `0x${string}` {
    if (!setRuleDataInputs) {
        throw new Error('setRuleDataInputs not found')
    }
    return encodeAbiParameters(setRuleDataInputs, [ruleData])
}

const getRuleDataOutputs: readonly AbiParameter[] | undefined = (
    Object.values(IRuleEntitlementAbi).find((abi) => abi.name === 'getRuleData') as
        | AbiFunction
        | undefined
)?.outputs

export function decodeEntitlementData(
    entitlementData: `0x${string}`,
): IRuleEntitlement.RuleDataStruct[] {
    if (!getRuleDataOutputs) {
        throw new Error('getRuleDataOutputs not found')
    }
    return decodeAbiParameters(
        getRuleDataOutputs,
        entitlementData,
    ) as IRuleEntitlement.RuleDataStruct[]
}
export function ruleDataToOperations(data: IRuleEntitlement.RuleDataStruct[]): Operation[] {
    if (data.length === 0) {
        return []
    }
    const decodedOperations: Operation[] = []

    const firstData: RuleData = data[0] as RuleData

    if (firstData.operations === undefined) {
        return []
    }

    firstData.operations.forEach((operation) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (operation.opType === OperationType.CHECK) {
            const checkOperation = firstData.checkOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.CHECK,
                checkType: checkOperation.opType,
                chainId: checkOperation.chainId,
                contractAddress: checkOperation.contractAddress,
                threshold: checkOperation.threshold,
            })
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        else if (operation.opType === OperationType.LOGICAL) {
            const logicalOperation = firstData.logicalOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.LOGICAL,
                logicalType: logicalOperation.logOpType as
                    | LogicalOperationType.AND
                    | LogicalOperationType.OR,

                leftOperation: decodedOperations[logicalOperation.leftOperationIndex],
                rightOperation: decodedOperations[logicalOperation.rightOperationIndex],
            })
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

export function postOrderTraversal(operation: Operation, data: DeepWriteable<RuleData>) {
    if (isLogicalOperation(operation)) {
        postOrderTraversal(operation.leftOperation, data)
        postOrderTraversal(operation.rightOperation, data)
    }

    if (isCheckOperation(operation)) {
        data.checkOperations.push({
            opType: operation.checkType,
            chainId: operation.chainId,
            contractAddress: operation.contractAddress,
            threshold: operation.threshold,
        })
        data.operations.push({
            opType: OperationType.CHECK,
            index: data.checkOperations.length - 1,
        })
    } else if (isLogicalOperation(operation)) {
        data.logicalOperations.push({
            logOpType: operation.logicalType,
            leftOperationIndex: data.logicalOperations.length, // Index of left child
            rightOperationIndex: data.logicalOperations.length + 1, // Index of right child
        })
        data.operations.push({
            opType: OperationType.LOGICAL,
            index: data.logicalOperations.length - 1,
        })
    }
}

export function treeToRuleData(root: Operation): IRuleEntitlement.RuleDataStruct {
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
    operation?: AndOperation,
): Promise<boolean> {
    if (!operation?.leftOperation || !operation?.rightOperation) {
        controller.abort()
        return false
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

    async function racer(operationEntry: Operation): Promise<boolean> {
        const result = await Promise.race([evaluateTree(newController, operationEntry), interupted])
        if (result === interuptFlag) {
            return false // interupted
        } else if (result === true) {
            return true
        } else {
            controller.abort()
            interupt()
            return false
        }
    }

    const checks = await Promise.all([
        racer(operation.leftOperation),
        racer(operation.rightOperation),
    ])
    const result = checks.every((res) => res)
    return result
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
    operation?: OrOperation,
): Promise<boolean> {
    if (!operation?.leftOperation || !operation?.rightOperation) {
        controller.abort()
        return false
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

    async function racer(operation: Operation): Promise<boolean> {
        const result = await Promise.race([evaluateTree(newController, operation), interupted])
        if (result === interuptFlag) {
            return false // interupted, the other must have returned true
        } else if (result === true) {
            // cancel the other operation
            newController.abort()
            interupt()
            return true
        } else {
            return false
        }
    }

    const checks = await Promise.all([
        racer(operation.leftOperation),
        racer(operation.rightOperation),
    ])
    const result = checks.some((res) => res)
    return result
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
    operation?: CheckOperation,
): Promise<boolean> {
    if (!operation) {
        controller.abort()
        return false
    }
    if (isCheckOperation(operation) && operation.checkType === CheckOperationType.MOCK) {
        const result = operation.chainId === 1n
        const delay = Number.parseInt(operation.threshold.valueOf().toString())
        return await new Promise((resolve) => {
            controller.signal.onabort = () => {
                if (timeout) {
                    clearTimeout(timeout)
                    resolve(false)
                }
            }

            const timeout = setTimeout(() => {
                if (result) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            }, delay)
        })
    } else {
        return false
    }
}

export async function evaluateTree(
    controller: AbortController,
    entry?: Operation,
): Promise<boolean> {
    if (!entry) {
        controller.abort()
        return false
    }
    const newController = new AbortController()
    controller.signal.addEventListener('abort', () => {
        newController.abort()
    })

    if (isLogicalOperation(entry)) {
        if (isAndOperation(entry)) {
            return evaluateAndOperation(newController, entry)
        } else if (isOrOperation(entry)) {
            return evaluateOrOperation(newController, entry)
        } else {
            throw new Error('Unknown operation type')
        }
    } else if (isCheckOperation(entry)) {
        return evaluateCheckOperation(newController, entry)
    } else {
        throw new Error('Unknown operation type')
    }
}

export function createExternalTokenStruct(addresses: `0x${string}`[]) {
    if (addresses.length === 0) {
        return NoopRuleData
    }
    const defaultChain = addresses.map((address) => ({
        chainId: 1n,
        address: address,
        type: CheckOperationType.ERC20 as const,
    }))
    return createOperationsTree(defaultChain)
}

export type ContractCheckOperation = {
    type: CheckOperationType
    chainId: bigint
    address: `0x${string}`
    threshold: bigint
}

export function createOperationsTree(
    checkOp: (Omit<ContractCheckOperation, 'threshold'> & {
        threshold?: bigint
    })[],
): IRuleEntitlement.RuleDataStruct {
    if (checkOp.length === 0) {
        return {
            operations: [NoopOperation],
            checkOperations: [],
            logicalOperations: [],
        }
    }

    let operations: Operation[] = checkOp.map((op) => ({
        opType: OperationType.CHECK,
        checkType: op.type,
        chainId: op.chainId,
        contractAddress: op.address,
        threshold: op.threshold ?? BigInt(1), // Example threshold, adjust as needed
    }))

    while (operations.length > 1) {
        const newOperations: Operation[] = []
        for (let i = 0; i < operations.length; i += 2) {
            if (i + 1 < operations.length) {
                newOperations.push({
                    opType: OperationType.LOGICAL,
                    logicalType: LogicalOperationType.AND,
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

export function createContractCheckOperationFromTree(
    entitlementData: IRuleEntitlement.RuleDataStruct,
): ContractCheckOperation[] {
    const operations = ruleDataToOperations([entitlementData])
    const checkOpSubsets: ContractCheckOperation[] = []
    operations.forEach((operation) => {
        if (isCheckOperation(operation)) {
            checkOpSubsets.push({
                address: operation.contractAddress,
                chainId: operation.chainId,
                type: operation.checkType,
                threshold: operation.threshold,
            })
        }
    })
    return checkOpSubsets
}
