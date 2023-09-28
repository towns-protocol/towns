import { PartialMessage } from '@bufbuild/protobuf'
import { evaluateTree } from './entitlement'
import {
    CheckOperation,
    AndOperation,
    OperationTree,
    Operation,
    OrOperation,
    IsEntitledOperation,
} from './gen/entitlement_pb'
import { compress, decompress } from 'brotli-compress'

function makeRandomOperation(depth: number): Operation {
    const rand = Math.random()

    if ((depth > 5 && depth < 10 && rand < 1 / 3) || (depth < 10 && rand < 1 / 2)) {
        return new Operation({
            operationClause: {
                case: 'andOperation',
                value: new AndOperation({
                    leftOperation: makeRandomOperation(depth + 1),
                    rightOperation: makeRandomOperation(depth + 1),
                }),
            },
        })
    } else if ((depth > 5 && depth < 10 && rand < 2 / 3) || (depth < 10 && rand > 1 / 2)) {
        return new Operation({
            operationClause: {
                case: 'orOperation',
                value: new OrOperation({
                    leftOperation: makeRandomOperation(depth + 1),
                    rightOperation: makeRandomOperation(depth + 1),
                }),
            },
        })
    } else {
        return new Operation({
            operationClause: {
                case: 'checkOperation',
                value: new CheckOperation({
                    checkClause: {
                        case: 'isEntitledOperation',
                        value: new IsEntitledOperation({
                            chainId: rand > 0.5 ? 'true' : 'false',
                            contractAddress: rand.toString(),
                        }),
                    },
                }),
            },
        })
    }
}

test('random', async () => {
    const operation = new OperationTree()
    operation.operation = makeRandomOperation(0)

    const data = operation.toJsonString()
    const bData = operation.toBinary()

    // it takes a Uint8Array and returns a Uint8Array
    const compressed = await compress(bData)

    // it takes a Uint8Array and returns a Uint8Array
    const decompressed = await decompress(compressed)
    const newOperation = OperationTree.fromBinary(decompressed)
    expect(newOperation.toJsonString()).toEqual(data)
    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
})

/**
 * An operation that always returns true
 */
const falseCheck = {
    operationClause: {
        case: 'checkOperation',
        value: new CheckOperation({
            checkClause: {
                case: 'isEntitledOperation',
                value: new IsEntitledOperation({
                    chainId: 'false',
                    contractAddress: '0.1',
                }),
            },
        }),
    } as const,
}

const slowFalseCheck = {
    operationClause: {
        case: 'checkOperation',
        value: new CheckOperation({
            checkClause: {
                case: 'isEntitledOperation',
                value: new IsEntitledOperation({
                    chainId: 'false',
                    contractAddress: '1.0',
                }),
            },
        }),
    } as const,
}
const trueCheck = {
    operationClause: {
        case: 'checkOperation',
        value: new CheckOperation({
            checkClause: {
                case: 'isEntitledOperation',
                value: new IsEntitledOperation({
                    chainId: 'true',
                    contractAddress: '0.1',
                }),
            },
        }),
    } as const,
}
const slowTrueCheck = {
    operationClause: {
        case: 'checkOperation',
        value: new CheckOperation({
            checkClause: {
                case: 'isEntitledOperation',
                value: new IsEntitledOperation({
                    chainId: 'true',
                    contractAddress: '1.0',
                }),
            },
        }),
    } as const,
}
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
    const operation = new OperationTree()
    const orOperation = {
        operationClause: {
            case: 'orOperation',
            value: new OrOperation({
                leftOperation: leftCheck,
                rightOperation: rightCheck,
            }),
        } as const,
    }

    operation.operation = new Operation(orOperation)

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
    expect(result).toBe(expectedResult)
})

const slowOrCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: true,
        expectedTime: 0.1,
    },
    {
        leftCheck: trueCheck,
        rightCheck: slowFalseCheck,
        expectedResult: true,
        expectedTime: 0.1,
    },
    {
        leftCheck: slowFalseCheck,
        rightCheck: trueCheck,
        expectedResult: true,
        expectedTime: 0.1,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: false,
        expectedTime: 1,
    },
]

test.each(slowOrCases)('slowOrOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation = new OperationTree()
    const orOperation = {
        operationClause: {
            case: 'orOperation',
            value: new OrOperation({
                leftOperation: leftCheck,
                rightOperation: rightCheck,
            }),
        } as const,
    }

    operation.operation = new Operation(orOperation)

    const controller = new AbortController()
    let start = performance.now()
    const result = await evaluateTree(controller, operation.operation)
    const timeTaken = performance.now() - start
    expect(timeTaken / 1000).toBeCloseTo(expectedTime, 1)
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
    const operation = new OperationTree()
    const andOperation = {
        operationClause: {
            case: 'andOperation',
            value: new OrOperation({
                leftOperation: leftCheck,
                rightOperation: rightCheck,
            }),
        } as const,
    }

    operation.operation = new Operation(andOperation)

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
    expect(result).toBe(expectedResult)
})

const slowAndCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: true,
        expectedTime: 1,
    },
    {
        leftCheck: slowTrueCheck,
        rightCheck: falseCheck,
        expectedResult: false,
        expectedTime: 0.1,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowTrueCheck,
        expectedResult: false,
        expectedTime: 0.1,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: false,
        expectedTime: 0.1,
    },
]

test.each(slowAndCases)('slowAndOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation = new OperationTree()
    const andOperation = {
        operationClause: {
            case: 'andOperation',
            value: new OrOperation({
                leftOperation: leftCheck,
                rightOperation: rightCheck,
            }),
        } as const,
    }

    operation.operation = new Operation(andOperation)

    const controller = new AbortController()
    let start = performance.now()
    const result = await evaluateTree(controller, operation.operation)
    const timeTaken = performance.now() - start

    expect(result).toBe(expectedResult)
    expect(timeTaken / 1000).toBeCloseTo(expectedTime, 1)
})

test('empty', async () => {
    const operation = new OperationTree()

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
    expect(result).toBeFalsy()
})

test('bogus', async () => {
    const operation = new OperationTree()
    const orOperation = {
        operationClause: {
            case: 'bogus',
            value: new AndOperation({
                leftOperation: trueCheck,
                rightOperation: falseCheck,
            }),
        } as const,
    } as any as PartialMessage<Operation>

    operation.operation = new Operation(orOperation)

    let threw = false
    try {
        const controller = new AbortController()
        await evaluateTree(controller, operation.operation)
    } catch (ex) {
        threw = true
    }
    expect(threw).toBeTruthy()
})

test('true', async () => {
    const operation = new OperationTree()
    operation.operation = new Operation(trueCheck)

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
    expect(result).toBeTruthy()
})

test('false', async () => {
    const operation = new OperationTree()
    operation.operation = new Operation(falseCheck)

    const controller = new AbortController()
    const result = await evaluateTree(controller, operation.operation)
    expect(result).toBeFalsy()
})
