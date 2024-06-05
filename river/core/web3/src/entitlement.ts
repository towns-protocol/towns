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
import { ethers } from 'ethers'
import { Address } from './ContractTypes'
import { MOCK_ADDRESS } from './Utils'

const zeroAddress = ethers.constants.AddressZero

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
    contractAddress: Address
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
    operations: [],
    checkOperations: [],
    logicalOperations: [],
}

type EntitledWalletOrZeroAddress = string

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

export const getOperationTree = async (address: Address, roleId: bigint): Promise<Operation> => {
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

const encodeRuleDataInputs: readonly AbiParameter[] | undefined = (
    Object.values(IRuleEntitlementAbi).find((abi) => abi.name === 'encodeRuleData') as
        | AbiFunction
        | undefined
)?.inputs

export function encodeEntitlementData(ruleData: IRuleEntitlement.RuleDataStruct): Address {
    if (!encodeRuleDataInputs) {
        throw new Error('setRuleDataInputs not found')
    }
    return encodeAbiParameters(encodeRuleDataInputs, [ruleData])
}

const getRuleDataOutputs: readonly AbiParameter[] | undefined = (
    Object.values(IRuleEntitlementAbi).find((abi) => abi.name === 'getRuleData') as
        | AbiFunction
        | undefined
)?.outputs

export function decodeEntitlementData(entitlementData: Address): IRuleEntitlement.RuleDataStruct[] {
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
    linkedWallets: string[],
    providers: ethers.providers.StaticJsonRpcProvider[],
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
            evaluateTree(newController, linkedWallets, providers, operationEntry),
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
    providers: ethers.providers.StaticJsonRpcProvider[],
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
            evaluateTree(newController, linkedWallets, providers, operation),
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
    providers: ethers.providers.StaticJsonRpcProvider[],
    operation?: CheckOperation,
): Promise<EntitledWalletOrZeroAddress> {
    if (!operation) {
        controller.abort()
        return zeroAddress
    }

    switch (operation.checkType) {
        case CheckOperationType.MOCK: {
            return evaluateMockOperation(operation, controller)
        }
        case CheckOperationType.ISENTITLED:
            throw new Error(`CheckOperationType.ISENTITLED not implemented`)
        case CheckOperationType.ERC20:
            throw new Error('CheckOperationType.ERC20 not implemented')
        case CheckOperationType.ERC721: {
            await Promise.all(providers.map((p) => p.ready))
            const provider = findProviderFromChainId(providers, operation.chainId)

            if (!provider) {
                controller.abort()
                return zeroAddress
            }
            return evaluateERC721Operation(operation, controller, provider, linkedWallets)
        }
        case CheckOperationType.ERC1155:
            throw new Error('CheckOperationType.ERC1155 not implemented')
        case CheckOperationType.NONE:
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
    providers: ethers.providers.StaticJsonRpcProvider[],
) {
    const controller = new AbortController()
    const result = evaluateTree(
        controller,
        linkedWallets,
        providers,
        operations[operations.length - 1],
    )
    controller.abort()
    return result
}

export async function evaluateTree(
    controller: AbortController,
    linkedWallets: string[],
    providers: ethers.providers.StaticJsonRpcProvider[],
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
            return evaluateAndOperation(newController, linkedWallets, providers, entry)
        } else if (isOrOperation(entry)) {
            return evaluateOrOperation(newController, linkedWallets, providers, entry)
        } else {
            throw new Error('Unknown operation type')
        }
    } else if (isCheckOperation(entry)) {
        return evaluateCheckOperation(newController, linkedWallets, providers, entry)
    } else {
        throw new Error('Unknown operation type')
    }
}

// These two methods are used to create a rule data struct for an external token or NFT
// checks for testing.
export function createExternalTokenStruct(
    addresses: Address[],
    checkOptions?: Partial<Omit<ContractCheckOperation, 'address'>>,
) {
    if (addresses.length === 0) {
        return NoopRuleData
    }
    const defaultChain = addresses.map((address) => ({
        chainId: checkOptions?.chainId ?? 1n,
        address: address,
        type: checkOptions?.type ?? (CheckOperationType.ERC20 as const),
        threshold: checkOptions?.threshold ?? BigInt(1),
    }))
    return createOperationsTree(defaultChain)
}

export function createExternalNFTStruct(
    addresses: Address[],
    checkOptions?: Partial<Omit<ContractCheckOperation, 'address'>>,
) {
    if (addresses.length === 0) {
        return NoopRuleData
    }
    const defaultChain = addresses.map((address) => ({
        // Anvil chain id
        chainId: checkOptions?.chainId ?? 31337n,
        address: address,
        type: checkOptions?.type ?? (CheckOperationType.ERC721 as const),
        threshold: checkOptions?.threshold ?? BigInt(1),
    }))
    return createOperationsTree(defaultChain)
}

export type ContractCheckOperation = {
    type: CheckOperationType
    chainId: bigint
    address: Address
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

async function evaluateMockOperation(
    operation: CheckOperation,
    controller: AbortController,
): Promise<EntitledWalletOrZeroAddress> {
    const result = operation.chainId === 1n
    const delay = Number.parseInt(operation.threshold.valueOf().toString())

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
    operation: CheckOperation,
    controller: AbortController,
    provider: ethers.providers.StaticJsonRpcProvider,
    linkedWallets: string[],
): Promise<EntitledWalletOrZeroAddress> {
    const contract = new ethers.Contract(
        operation.contractAddress,
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

    if (walletsWithAsset.length > 0 && accumulatedBalance.gte(operation.threshold)) {
        return walletsWithAsset[0].wallet
    } else {
        controller.abort()
        return zeroAddress
    }
}

function findProviderFromChainId(
    providers: ethers.providers.StaticJsonRpcProvider[],
    chainId: bigint,
) {
    return providers.find((p) => p.network.chainId === Number(chainId))
}

function isValidAddress(value: unknown): value is Address {
    return (
        typeof value === 'string' &&
        ethers.utils.isAddress(value) &&
        value !== ethers.constants.AddressZero
    )
}
