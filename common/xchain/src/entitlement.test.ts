import {
    CheckOperation,
    CheckOperationType,
    LogicalOperationType,
    OperationType,
    evaluateTree,
} from './entitlement'

import { Operation, AndOperation, OrOperation } from './entitlement'
function makeRandomOperation(depth: number): Operation {
    const rand = Math.random()

    if ((depth > 5 && depth < 10 && rand < 1 / 3) || (depth < 10 && rand < 1 / 2)) {
        return {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.AND,
            leftOperation: makeRandomOperation(depth + 1),
            rightOperation: makeRandomOperation(depth + 1),
        }
    } else if ((depth > 5 && depth < 10 && rand < 2 / 3) || (depth < 10 && rand > 1 / 2)) {
        return {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: makeRandomOperation(depth + 1),
            rightOperation: makeRandomOperation(depth + 1),
        }
    } else {
        return {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.MOCK,
            chainId: rand > 0.5 ? 1n : 0n,
            contractAddress: rand.toString(),
            threshold: rand > 0.5 ? 500n : 10n,
        }
    }
}

test('random', async () => {
    const operation = makeRandomOperation(0)

    // it takes a Uint8Array and returns a Uint8Array
    const controller = new AbortController()
    const result = await evaluateTree(controller, operation)
})

/**
 * An operation that always returns true
 */
const falseCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: '0.1',
    threshold: 10n,
} as const

const slowFalseCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: '1.0',
    threshold: 500n,
} as const

const trueCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '0.1',
    threshold: 10n,
} as const

const slowTrueCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '1.0',
    threshold: 500n,
} as const

/*
["andOperation", trueCheck, trueCheck, true],
["andOperation", falseCheck, falseCheck, false],
["andOperation", falseCheck, falseCheck, false],
["andOperation", falseCheck, falseCheck, false],
];
*/

const orCases = [
    { leftCheck: trueCheck, rightCheck: trueCheck, expectedResult: true },
    { leftCheck: trueCheck, rightCheck: falseCheck, expectedResult: true },
    { leftCheck: falseCheck, rightCheck: trueCheck, expectedResult: true },
    { leftCheck: falseCheck, rightCheck: falseCheck, expectedResult: false },
]

test.each(orCases)('orOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult } = props
    const orOperation: OrOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.OR,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const result = await evaluateTree(controller, orOperation)
    expect(result).toBe(expectedResult)
})

const slowOrCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: true,
        expectedTime: 10,
    },
    {
        leftCheck: trueCheck,
        rightCheck: slowFalseCheck,
        expectedResult: true,
        expectedTime: 10,
    },
    {
        leftCheck: slowFalseCheck,
        rightCheck: trueCheck,
        expectedResult: true,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: false,
        expectedTime: 500,
    },
]

test.each(slowOrCases)('slowOrOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation: OrOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.OR,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    let start = performance.now()
    const result = await evaluateTree(controller, operation)
    const timeTaken = performance.now() - start
    expect(timeTaken).toBeCloseTo(expectedTime, -2)
    expect(result).toBe(expectedResult)
})

const andCases = [
    { leftCheck: trueCheck, rightCheck: trueCheck, expectedResult: true },
    { leftCheck: trueCheck, rightCheck: falseCheck, expectedResult: false },
    { leftCheck: falseCheck, rightCheck: trueCheck, expectedResult: false },
    { leftCheck: falseCheck, rightCheck: falseCheck, expectedResult: false },
]

test.each(andCases)('andOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult } = props
    const operation: AndOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.AND,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation)
    expect(result).toBe(expectedResult)
})

const slowAndCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: true,
        expectedTime: 500,
    },
    {
        leftCheck: slowTrueCheck,
        rightCheck: falseCheck,
        expectedResult: false,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowTrueCheck,
        expectedResult: false,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: false,
        expectedTime: 10,
    },
]

test.each(slowAndCases)('slowAndOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation: AndOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.AND,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    let start = performance.now()
    const result = await evaluateTree(controller, operation)
    const timeTaken = performance.now() - start

    expect(result).toBe(expectedResult)
    expect(timeTaken).toBeCloseTo(expectedTime, -2)
})

test('empty', async () => {
    const controller = new AbortController()
    const result = await evaluateTree(controller, undefined)
    expect(result).toBeFalsy()
})

test('true', async () => {
    const operation = trueCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation)
    expect(result).toBeTruthy()
})

test('false', async () => {
    const operation = falseCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation)
    expect(result).toBeFalsy()
})
