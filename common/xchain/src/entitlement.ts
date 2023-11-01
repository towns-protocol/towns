import IEntitlementRuleAbi from '@towns/generated/localhost/v3/abis/IEntitlementRule.abi'

import { Transport } from 'viem'
import { createPublicClient, http, createWalletClient, decodeFunctionResult } from 'viem'
import { mainnet } from 'viem/chains'

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

export type ContractCheckOperation = {
    opType: CheckOperationType
    chainId: bigint
    contractAddress: string
    threshold: bigint
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
    contractAddress: string
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

export type LogicalOperation = OrOperation | AndOperation
export type Operation = CheckOperation | OrOperation | AndOperation

function isCheckOperation(operation: Operation): operation is CheckOperation {
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

const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
})

const getOperationTree = async (address: `0x${string}`) => {
    const [operations, logicalOperations, checkOperations]: [
        readonly ContractOperation[],
        readonly ContractLogicalOperation[],
        readonly ContractCheckOperation[],
    ] = await Promise.all([
        publicClient.readContract({
            address: address,
            abi: IEntitlementRuleAbi,
            functionName: 'getOperations',
        }),
        publicClient.readContract({
            address: address,
            abi: IEntitlementRuleAbi,
            functionName: 'getLogicalOperations',
        }),
        publicClient.readContract({
            address: address,
            abi: IEntitlementRuleAbi,
            functionName: 'getCheckOperations',
        }),
    ])

    const decodedOperations: Operation[] = []
    operations.forEach((operation) => {
        if (operation.opType === OperationType.CHECK) {
            const checkOperation = checkOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.CHECK,
                checkType: checkOperation.opType,
                chainId: checkOperation.chainId,
                contractAddress: checkOperation.contractAddress,
                threshold: checkOperation.threshold,
            })
        } else if (operation.opType === OperationType.LOGICAL) {
            const logicalOperation = logicalOperations[operation.index]
            decodedOperations.push({
                opType: OperationType.LOGICAL,
                logicalType: logicalOperation.logOpType as
                    | LogicalOperationType.AND
                    | LogicalOperationType.OR,

                leftOperation: decodedOperations[logicalOperation.leftOperationIndex],
                rightOperation: decodedOperations[logicalOperation.rightOperationIndex],
            })
        } else {
            throw new Error('Unknown logical operation type')
        }
    })

    function postOrderArrayToTree() {
        const stack: Operation[] = []

        decodedOperations.forEach((op) => {
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
    return postOrderArrayToTree()
}

/*
const value = decodeFunctionResult({
    abi: IEntitlementRuleAbi,
    functionName: 'getOperations',
    data: '0x000000000000000000000000a5cc3c03994db5b0d9a5eedd10cabab0813678ac',
})

const value2 = decodeFunctionResult({
    abi: IEntitlementRuleAbi,
    functionName: 'getCheckOperations',
    data: '0x000000000000000000000000a5cc3c03994db5b0d9a5eedd10cabab0813678ac',
})

const value3 = decodeFunctionResult({
    abi: IEntitlementRuleAbi,
    functionName: 'getLogicalOperations',
    data: '0x000000000000000000000000a5cc3c03994db5b0d9a5eedd10cabab0813678ac',
})

export const walletClient = createWalletClient({
    chain: mainnet,
    transport: {} as any as Transport,
})
*/

//export const [account] = await walletClient.getAddresses()

/*
const { request } =await publicClient.simulateContract({
    address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
    abi: IEntitlementRuleAbi,
    functionName: 'addLogicalOperation',
    args: [1, 1, 2],
    account,
})
*/

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
            let timeout: NodeJS.Timeout
            controller.signal.onabort = () => {
                if (timeout) {
                    clearTimeout(timeout)
                    resolve(false)
                }
            }

            timeout = setTimeout(() => {
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
