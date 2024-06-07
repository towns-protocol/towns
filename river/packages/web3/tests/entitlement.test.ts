import { ethers } from 'ethers'
import {
    CheckOperation,
    CheckOperationType,
    LogicalOperationType,
    OperationType,
    decodeEntitlementData,
    encodeEntitlementData,
    evaluateTree,
    postOrderArrayToTree,
    Operation,
    AndOperation,
    OrOperation,
    treeToRuleData,
    ruleDataToOperations,
} from '../src/entitlement'
import { MOCK_ADDRESS } from '../src/Utils'
import { zeroAddress } from 'viem'

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
            contractAddress: generateRandomEthAddress(),
            threshold: rand > 0.5 ? 500n : 10n,
        }
    }
}

test('random', async () => {
    const operation = makeRandomOperation(0)
    // it takes a Uint8Array and returns a Uint8Array
    const controller = new AbortController()
    const result = await evaluateTree(controller, [], [], operation)
    expect(result).toBeDefined()
})

function generateRandomEthAddress(): `0x${string}` {
    let address: `0x${string}` = '0x'
    const characters = '0123456789abcdef'
    for (let i = 0; i < 40; i++) {
        address += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return address
}
/**
 * An operation that always returns true
 */
const falseCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: `0x0`,
    threshold: 10n,
} as const

const slowFalseCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: '0x1',
    threshold: 500n,
} as const

const trueCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '0x0',
    threshold: 10n,
} as const

const slowTrueCheck: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '0x1',
    threshold: 500n,
} as const

// We have a custom NFT contract deployed to both ethereum sepolia and base sepolia where we
// can mint NFTs for testing. These are included in our unit tests because the local chain
// stack does not always behave the same as remote chains, so our xchain tests use them. We
// reproduce the same unit tests here to ensure parity between evaluation in xchain and the
// client.
// Contract addresses for the test NFT contracts.
const SepoliaTestNftContract: `0x${string}` = '0xb088b3f2b35511A611bF2aaC13fE605d491D6C19'
const SepoliaTestNftWallet_1Token: `0x${string}` = '0x1FDBA84c2153568bc22686B88B617CF64cdb0637'
const SepoliaTestNftWallet_3Tokens: `0x${string}` = '0xB79Af997239A334355F60DBeD75bEDf30AcD37bD'
const SepoliaTestNftWallet_2Tokens: `0x${string}` = '0x8cECcB1e5537040Fc63A06C88b4c1dE61880dA4d'

const nftCheckEthereumSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 11155111n,
    contractAddress: SepoliaTestNftContract,
    threshold: 1n,
} as const

const nftMultiCheckEthereumSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 11155111n,
    contractAddress: SepoliaTestNftContract,
    threshold: 6n,
} as const

const nftMultiCheckHighThresholdEthereumSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 11155111n,
    contractAddress: SepoliaTestNftContract,
    threshold: 100n,
} as const

const nftCheckBaseSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    threshold: 1n,
} as const

const nftMultiCheckBaseSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    threshold: 6n,
} as const

const nftMultiCheckHighThresholdBaseSepolia: CheckOperation = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    threshold: 100n,
} as const

const ethSepoliaProvider = new ethers.providers.JsonRpcProvider(
    'https://ethereum-sepolia-rpc.publicnode.com',
)
const baseSepoliaProvider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org')

const nftCases = [
    {
        desc: 'base sepolia',
        check: nftCheckBaseSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (no tokens)',
        check: nftCheckBaseSepolia,
        wallets: [ethers.constants.AddressZero],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (insufficient balance)',
        check: nftMultiCheckBaseSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia multi-wallet',
        check: nftMultiCheckBaseSepolia,
        wallets: [
            SepoliaTestNftWallet_1Token,
            SepoliaTestNftWallet_2Tokens,
            SepoliaTestNftWallet_3Tokens,
        ],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia multi-wallet (insufficient balance)',
        check: nftMultiCheckHighThresholdBaseSepolia,
        wallets: [
            SepoliaTestNftWallet_1Token,
            SepoliaTestNftWallet_2Tokens,
            SepoliaTestNftWallet_3Tokens,
        ],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },

    {
        desc: 'eth sepolia',
        check: nftCheckEthereumSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (no tokens)',
        check: nftCheckEthereumSepolia,
        wallets: [ethers.constants.AddressZero],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (insufficient balance)',
        check: nftMultiCheckEthereumSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia multi-wallet',
        check: nftMultiCheckEthereumSepolia,
        wallets: [
            SepoliaTestNftWallet_1Token,
            SepoliaTestNftWallet_2Tokens,
            SepoliaTestNftWallet_3Tokens,
        ],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia multi-wallet (insufficient balance)',
        check: nftMultiCheckHighThresholdEthereumSepolia,
        wallets: [
            SepoliaTestNftWallet_1Token,
            SepoliaTestNftWallet_2Tokens,
            SepoliaTestNftWallet_3Tokens,
        ],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
]

test.each(nftCases)('erc721Check - $desc', async (props) => {
    const { check, wallets, provider, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, [provider], check)
    if (expectedResult) {
        expect(result).toBeTruthy()
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

/*
["andOperation", trueCheck, trueCheck, true],
["andOperation", falseCheck, falseCheck, false],
["andOperation", falseCheck, falseCheck, false],
["andOperation", falseCheck, falseCheck, false],
];
*/

const orCases = [
    { leftCheck: trueCheck, rightCheck: trueCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: trueCheck, rightCheck: falseCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: falseCheck, rightCheck: trueCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: falseCheck, rightCheck: falseCheck, expectedResult: ethers.constants.AddressZero },
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
    const result = await evaluateTree(controller, [], [], orOperation)
    expect(result).toBe(expectedResult)
})

const slowOrCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: MOCK_ADDRESS,
        expectedTime: 10,
    },
    {
        leftCheck: trueCheck,
        rightCheck: slowFalseCheck,
        expectedResult: MOCK_ADDRESS,
        expectedTime: 10,
    },
    {
        leftCheck: slowFalseCheck,
        rightCheck: trueCheck,
        expectedResult: MOCK_ADDRESS,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: ethers.constants.AddressZero,
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
    const start = performance.now()
    const result = await evaluateTree(controller, [], [], operation)
    const timeTaken = performance.now() - start
    expect(timeTaken).toBeCloseTo(expectedTime, -2)
    expect(result).toBe(expectedResult)
})

const andCases = [
    { leftCheck: trueCheck, rightCheck: trueCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: trueCheck, rightCheck: falseCheck, expectedResult: ethers.constants.AddressZero },
    { leftCheck: falseCheck, rightCheck: trueCheck, expectedResult: ethers.constants.AddressZero },
    { leftCheck: falseCheck, rightCheck: falseCheck, expectedResult: ethers.constants.AddressZero },
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
    const result = await evaluateTree(controller, [], [], operation)
    expect(result).toBe(expectedResult)
})

const slowAndCases = [
    {
        leftCheck: trueCheck,
        rightCheck: slowTrueCheck,
        expectedResult: MOCK_ADDRESS,
        expectedTime: 500,
    },
    {
        leftCheck: slowTrueCheck,
        rightCheck: falseCheck,
        expectedResult: ethers.constants.AddressZero,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowTrueCheck,
        expectedResult: ethers.constants.AddressZero,
        expectedTime: 10,
    },
    {
        leftCheck: falseCheck,
        rightCheck: slowFalseCheck,
        expectedResult: ethers.constants.AddressZero,
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
    const start = performance.now()
    const result = await evaluateTree(controller, [], [], operation)
    const timeTaken = performance.now() - start

    expect(result).toBe(expectedResult)
    expect(timeTaken).toBeCloseTo(expectedTime, -2)
})

test('empty', async () => {
    const controller = new AbortController()
    const result = await evaluateTree(controller, [], [], undefined)
    expect(result).toBe(ethers.constants.AddressZero)
})

test('true', async () => {
    const operation = trueCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], [], operation)
    expect(result).toBe(MOCK_ADDRESS)
})

test('false', async () => {
    const operation = falseCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], [], operation)
    expect(result).toBe(ethers.constants.AddressZero)
})

test('encode', async () => {
    const randomTree = makeRandomOperation(5)

    const data = treeToRuleData(randomTree)
    const encoded = encodeEntitlementData(data)

    const decodedDag = decodeEntitlementData(encoded)
    const operations = ruleDataToOperations(decodedDag)
    const newTree = postOrderArrayToTree(operations)
    expect(randomTree.opType === newTree.opType).toBeTruthy()
})
