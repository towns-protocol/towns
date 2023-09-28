import {
    AndOperation,
    CheckOperation,
    OrOperation,
    Operation,
    ERC20Operation,
    ERC721Operation,
    ERC1155Operation,
    IsEntitledOperation,
} from './gen/entitlement_pb'

export type OperationType = Operation['operationClause']
export function isCheckOperation(
    operation: OperationType,
): operation is { value: CheckOperation; case: 'checkOperation' } {
    return operation.case === 'checkOperation'
}

export function isAndOperation(
    operation: OperationType,
): operation is { value: AndOperation; case: 'andOperation' } {
    return operation.case === 'andOperation'
}

export function isOrOperation(
    operation: OperationType,
): operation is { value: OrOperation; case: 'orOperation' } {
    return operation.case === 'orOperation'
}

export type CheckOperationType = CheckOperation['checkClause']

export function isERC20Operation(
    operation: CheckOperationType,
): operation is { value: ERC20Operation; case: 'erc20Operation' } {
    return operation.case === 'erc20Operation'
}

export function isERC721Operation(
    operation: CheckOperationType,
): operation is { value: ERC721Operation; case: 'erc721Operation' } {
    return operation.case === 'erc721Operation'
}

export function isERC1155Operation(
    operation: CheckOperationType,
): operation is { value: ERC1155Operation; case: 'erc1155Operation' } {
    return operation.case === 'erc1155Operation'
}

export function isIsEntitledOperation(
    operation: CheckOperationType,
): operation is { value: IsEntitledOperation; case: 'isEntitledOperation' } {
    return operation.case === 'isEntitledOperation'
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
    const { checkClause } = operation
    if (isIsEntitledOperation(checkClause)) {
        const result = checkClause.value.chainId === 'true'
        const delay = Number.parseFloat(checkClause.value.contractAddress)
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
            }, delay * 1000)
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

    if (isAndOperation(entry.operationClause)) {
        return evaluateAndOperation(newController, entry.operationClause.value)
    } else if (isOrOperation(entry.operationClause)) {
        return evaluateOrOperation(newController, entry.operationClause.value)
    } else if (isCheckOperation(entry.operationClause)) {
        return evaluateCheckOperation(newController, entry.operationClause.value)
    } else {
        throw new Error('Unknown operation type')
    }
}
