import { ethers } from 'ethers'
import {
    CheckOperationV2,
    CheckOperationType,
    DecodedCheckOperation,
    LogicalOperationType,
    LogicalOperation,
    encodeRuleData,
    decodeRuleData,
    encodeRuleDataV2,
    decodeRuleDataV2,
    NoopOperation,
    OperationType,
    evaluateTree,
    postOrderArrayToTree,
    Operation,
    AndOperation,
    OrOperation,
    treeToRuleData,
    ruleDataToOperations,
    encodeThresholdParams,
    decodeThresholdParams,
    encodeERC1155Params,
    decodeERC1155Params,
    createOperationsTree,
} from '../src/entitlement'
import { MOCK_ADDRESS, MOCK_ADDRESS_2, MOCK_ADDRESS_3 } from '../src/Utils'
import { zeroAddress } from 'viem'
import { Address } from '../src/ContractTypes'
import { convertRuleDataV2ToV1 } from '../src/ConvertersEntitlements'
import { IRuleEntitlementV2Base } from '../src/v3/IRuleEntitlementV2Shim'

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
            params: encodeThresholdParams({ threshold: rand > 0.5 ? 500n : 10n }),
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

function generateRandomEthAddress(): Address {
    let address: Address = '0x'
    const characters = '0123456789abcdef'
    for (let i = 0; i < 40; i++) {
        address += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return address
}
/**
 * An operation that always returns true
 */
const falseCheck: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: `0x0`,
    params: encodeThresholdParams({ threshold: 10n }),
} as const

const slowFalseCheck: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 0n,
    contractAddress: '0x1',
    params: encodeThresholdParams({ threshold: 500n }),
} as const

const trueCheck: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '0x0',
    params: encodeThresholdParams({ threshold: 10n }),
} as const

const slowTrueCheck: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.MOCK,
    chainId: 1n,
    contractAddress: '0x1',
    params: encodeThresholdParams({ threshold: 500n }),
} as const

// We have a custom NFT contract deployed to both ethereum sepolia and base sepolia where we
// can mint NFTs for testing. These are included in our unit tests because the local chain
// stack does not always behave the same as remote chains, so our xchain tests use them. We
// reproduce the same unit tests here to ensure parity between evaluation in xchain and the
// client.
// Contract addresses for the test NFT contracts.
const SepoliaTestNftContract: Address = '0xb088b3f2b35511A611bF2aaC13fE605d491D6C19'
const SepoliaTestNftWallet_1Token: Address = '0x1FDBA84c2153568bc22686B88B617CF64cdb0637'
const SepoliaTestNftWallet_3Tokens: Address = '0xB79Af997239A334355F60DBeD75bEDf30AcD37bD'
const SepoliaTestNftWallet_2Tokens: Address = '0x8cECcB1e5537040Fc63A06C88b4c1dE61880dA4d'

const ethereumSepoliaChainId = 11155111n
const baseSepoliaChainId = 84532n

const nftCheckEthereumSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: ethereumSepoliaChainId,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 1n }),
} as const

const nftMultiCheckEthereumSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: ethereumSepoliaChainId,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 6n }),
} as const

const nftMultiCheckHighThresholdEthereumSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: ethereumSepoliaChainId,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 100n }),
} as const

const nftCheckBaseSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 1n }),
} as const

const nftMultiCheckBaseSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 6n }),
} as const

const nftMultiCheckHighThresholdBaseSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC721,
    chainId: 84532n,
    contractAddress: SepoliaTestNftContract,
    params: encodeThresholdParams({ threshold: 100n }),
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

// These are the addresses of the chain link test contract on base sepolia and ethereum sepolia.
const baseSepoliaChainLinkContract: Address = '0xE4aB69C077896252FAFBD49EFD26B5D171A32410'
const ethSepoliaChainLinkContract: Address = '0x779877A7B0D9E8603169DdbD7836e478b4624789'

// The following are the addresses of the wallets that hold the chain link tokens for testing.
// Some wallet addresses are duplicated for the sake of self-documenting variable names.
const sepoliaChainLinkWallet_50Link: Address = '0x4BCfC6962Ab0297aF801da21216014F53B46E991'
const sepoliaChainLinkWallet_25Link: Address = '0xa4D440AeA5F555feEB5AEa0ddcED6e1B9FaD6A9C'
const baseSepoliaChainLinkWallet_50Link: Address = '0x4BCfC6962Ab0297aF801da21216014F53B46E991'
const baseSepoliaChainLinkWallet_25Link: Address = '0xa4D440AeA5F555feEB5AEa0ddcED6e1B9FaD6A9C'
const testEmptyAccount: Address = '0xb227905F186095083869928BAb49cA9CE9546817'

// This wallet contains .5ETH on Base Sepolia
const baseSepolia0_5EthWallet = '0x4BCfC6962Ab0297aF801da21216014F53B46E991'
// This wallet contains .05 ETH on Base Sepolia
const baseSepolia0_05EthWallet = '0xB79Af997239A334355F60DBeD75bEDf30AcD37bD'

// .2 ETH on Ethereum Sepolia
const sepolia0_2EthWallet = '0x8cECcB1e5537040Fc63A06C88b4c1dE61880dA4d'
// .015 ETH on Ethereum Sepolia
const sepolia0_015EthWallet = '0xB4d85De80afE92C97293c32B1C0c604133d0332E'

const chainlinkExp = BigInt(10) ** BigInt(18)

const nativeCoinBalance0_1Eth_Sepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.NATIVE_COIN_BALANCE,
    chainId: ethereumSepoliaChainId,
    contractAddress: ethers.constants.AddressZero,
    params: encodeThresholdParams({ threshold: 100_000_000_000_000_000n }),
}

const nativeCoinBalance0_2Eth_Sepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_1Eth_Sepolia,
    params: encodeThresholdParams({ threshold: 200_000_000_000_000_000n }),
}

const nativeCoinBalance0_21Eth_Sepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_1Eth_Sepolia,
    params: encodeThresholdParams({ threshold: 210_000_000_000_000_000n }),
}

const nativeCoinBalance0_3Eth_Sepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_1Eth_Sepolia,
    params: encodeThresholdParams({ threshold: 300_000_000_000_000_000n }),
}

const nativeCoinBalance0_4Eth_BaseSepolia: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.NATIVE_COIN_BALANCE,
    chainId: baseSepoliaChainId,
    contractAddress: ethers.constants.AddressZero,
    params: encodeThresholdParams({ threshold: 400_000_000_000_000_000n }),
}

const nativeCoinBalance0_5Eth_BaseSepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_4Eth_BaseSepolia,
    params: encodeThresholdParams({ threshold: 500_000_000_000_000_000n }),
}

const nativeCoinBalance0_52Eth_BaseSepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_4Eth_BaseSepolia,
    params: encodeThresholdParams({ threshold: 520_000_000_000_000_000n }),
}

const nativeCoinBalance0_6Eth_BaseSepolia: CheckOperationV2 = {
    ...nativeCoinBalance0_4Eth_BaseSepolia,
    params: encodeThresholdParams({ threshold: 600_000_000_000_000_000n }),
}

const erc20ChainLinkCheckBaseSepolia_20Tokens: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC20,
    chainId: 84532n,
    contractAddress: baseSepoliaChainLinkContract,
    params: encodeThresholdParams({ threshold: 20n * chainlinkExp }),
}

const erc20ChainLinkCheckBaseSepolia_30Tokens: CheckOperationV2 = {
    ...erc20ChainLinkCheckBaseSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 30n * chainlinkExp }),
}

const erc20ChainLinkCheckBaseSepolia_75Tokens: CheckOperationV2 = {
    ...erc20ChainLinkCheckBaseSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 75n * chainlinkExp }),
}

const erc20ChainLinkCheckBaseSepolia_90Tokens: CheckOperationV2 = {
    ...erc20ChainLinkCheckBaseSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 90n * chainlinkExp }),
}

const erc20ChainLinkEthereumSepolia_20Tokens: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC20,
    chainId: ethereumSepoliaChainId,
    contractAddress: ethSepoliaChainLinkContract,
    params: encodeThresholdParams({ threshold: 20n * chainlinkExp }),
}

const erc20ChainLinkCheckEthereumSepolia_30Tokens: CheckOperationV2 = {
    ...erc20ChainLinkEthereumSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 30n * chainlinkExp }),
}

const erc20ChainLinkCheckEthereumSepolia_75Tokens: CheckOperationV2 = {
    ...erc20ChainLinkEthereumSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 75n * chainlinkExp }),
}

const erc20ChainLinkCheckEthereumSepolia_90Tokens: CheckOperationV2 = {
    ...erc20ChainLinkEthereumSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 90n * chainlinkExp }),
}

const nativeCoinBalanceCases = [
    {
        desc: 'eth sepolia',
        check: nativeCoinBalance0_2Eth_Sepolia,
        wallets: [sepolia0_2EthWallet],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (multiwallet)',
        check: nativeCoinBalance0_21Eth_Sepolia,
        wallets: [sepolia0_2EthWallet, sepolia0_015EthWallet],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (insufficient balance)',
        check: nativeCoinBalance0_1Eth_Sepolia,
        wallets: [sepolia0_015EthWallet],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (multiwallet, insufficient balance)',
        check: nativeCoinBalance0_3Eth_Sepolia,
        wallets: [sepolia0_2EthWallet, sepolia0_015EthWallet],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (insufficient balance, no eth)',
        check: nativeCoinBalance0_1Eth_Sepolia,
        wallets: [testEmptyAccount],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia',
        check: nativeCoinBalance0_5Eth_BaseSepolia,
        wallets: [baseSepolia0_5EthWallet],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (multiwallet)',
        check: nativeCoinBalance0_52Eth_BaseSepolia,
        wallets: [baseSepolia0_5EthWallet, baseSepolia0_05EthWallet],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (insufficient balance)',
        check: nativeCoinBalance0_4Eth_BaseSepolia,
        wallets: [baseSepolia0_05EthWallet],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (multiwallet, insufficient balance)',
        check: nativeCoinBalance0_6Eth_BaseSepolia,
        wallets: [baseSepolia0_5EthWallet, baseSepolia0_05EthWallet],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (insufficient balance, no eth)',
        check: nativeCoinBalance0_4Eth_BaseSepolia,
        wallets: [testEmptyAccount],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
]

test.each(nativeCoinBalanceCases)('Native Coin Balance Check - $desc', async (props) => {
    const { check, wallets, provider, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, [provider], check)
    if (expectedResult) {
        expect(result).toBeTruthy()
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

const erc20Cases = [
    {
        desc: 'base sepolia (empty wallet, false)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [testEmptyAccount],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (single wallet)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two wallets)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, testEmptyAccount],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (two wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, testEmptyAccount],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'base sepolia (two nonempty wallets, true)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_50Link],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two nonempty wallets, exact balance - true)',
        check: erc20ChainLinkCheckBaseSepolia_75Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_50Link],
        provider: baseSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two nonempty wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_90Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_50Link],
        provider: baseSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (empty wallet, false)',
        check: erc20ChainLinkCheckEthereumSepolia_30Tokens,
        wallets: [testEmptyAccount],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (single wallet)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [sepoliaChainLinkWallet_25Link],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (two wallets)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, testEmptyAccount],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [sepoliaChainLinkWallet_25Link],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (two wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, testEmptyAccount],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (two nonempty wallets, exact balance - true)',
        check: erc20ChainLinkCheckEthereumSepolia_75Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, sepoliaChainLinkWallet_50Link],
        provider: ethSepoliaProvider,
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (two nonempty wallets, false)',
        check: erc20ChainLinkCheckEthereumSepolia_90Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, sepoliaChainLinkWallet_50Link],
        provider: ethSepoliaProvider,
        expectedResult: false,
    },
]

test.each(erc20Cases)('erc20Check - $desc', async (props) => {
    const { check, wallets, provider, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, [provider], check)
    if (expectedResult) {
        expect(result).toBeTruthy()
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

const errorTests = [
    {
        desc: 'erc20 invalid check (chainId)',
        check: {
            ...erc20ChainLinkCheckBaseSepolia_20Tokens,
            chainId: -1n,
        },
        error: 'Invalid chain id for check operation ERC20',
    },
    {
        desc: 'erc20 invalid check (contractAddress)',
        check: {
            ...erc20ChainLinkCheckBaseSepolia_20Tokens,
            contractAddress: ethers.constants.AddressZero as Address,
        },
    },
    {
        desc: 'erc721 invalid check (chainId)',
        check: {
            ...nftCheckBaseSepolia,
            opType: OperationType.CHECK,
            chainId: -1n,
        },
    },
    {
        desc: 'erc721 invalid check (contractAddress)',
        check: {
            ...nftCheckBaseSepolia,
            opType: OperationType.CHECK,
            contractAddress: ethers.constants.AddressZero as Address,
        },
    },
    {
        desc: 'custom entitlement invalid check (contractAddress)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: 1n,
            contractAddress: ethers.constants.AddressZero as Address,
        },
    },
    {
        desc: 'custom entitlement invalid check (chainId)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: -1n,
            contractAddress: nftCheckBaseSepolia.contractAddress,
        },
    },
    {
        desc: 'erc 1155 invalid check (contractAddress)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC1155,
            chainId: 1n,
            contractAddress: ethers.constants.AddressZero as Address,
        },
    },
]

test.each(errorTests)('error - $desc', async (props) => {
    const { check, error } = props
    const controller = new AbortController()
    await expect(
        evaluateTree(
            controller,
            [SepoliaTestNftWallet_1Token],
            [ethSepoliaProvider],
            check as CheckOperationV2,
        ),
    ).rejects.toThrow(error)
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

test('encode/decode rule data v2', async () => {
    const randomTree = makeRandomOperation(5)

    const data = treeToRuleData(randomTree)
    const encoded = encodeRuleDataV2(data)

    const decodedDag = decodeRuleDataV2(encoded)
    const operations = ruleDataToOperations(decodedDag)
    const newTree = postOrderArrayToTree(operations)
    expect(randomTree.opType === newTree.opType).toBeTruthy()
})

// encode/decode should respect address equality semantics but may not maintain case
function addressesEqual(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase()
}

test('encode/decode rule data', async () => {
    const randomTree = makeRandomOperation(5)
    const data = treeToRuleData(randomTree)
    const v1 = convertRuleDataV2ToV1(data)
    const encoded = encodeRuleData(v1)
    const decodedDag = decodeRuleData(encoded)

    for (let i = 0; i < v1.operations.length; i++) {
        expect(v1.operations[i].opType).toBe(decodedDag.operations[i].opType)
        expect(v1.operations[i].index).toBe(decodedDag.operations[i].index)
    }

    for (let i = 0; i < v1.logicalOperations.length; i++) {
        expect(v1.logicalOperations[i].logOpType).toBe(decodedDag.logicalOperations[i].logOpType)
        expect(v1.logicalOperations[i].leftOperationIndex).toBe(
            decodedDag.logicalOperations[i].leftOperationIndex,
        )
        expect(v1.logicalOperations[i].rightOperationIndex).toBe(
            decodedDag.logicalOperations[i].rightOperationIndex,
        )
    }

    for (let i = 0; i < v1.checkOperations.length; i++) {
        expect(v1.checkOperations[i].opType).toBe(decodedDag.checkOperations[i].opType)
        expect(v1.checkOperations[i].chainId).toBe(decodedDag.checkOperations[i].chainId)
        expect(
            addressesEqual(
                v1.checkOperations[i].contractAddress as string,
                decodedDag.checkOperations[i].contractAddress as string,
            ),
        ).toBeTruthy()
        expect(v1.checkOperations[i].threshold).toBe(decodedDag.checkOperations[i].threshold)
    }
})

describe('threshold params', () => {
    test('encode/decode', () => {
        const encodedParams = encodeThresholdParams({ threshold: BigInt(100) })
        const decodedParams = decodeThresholdParams(encodedParams)
        expect(decodedParams).toEqual({ threshold: BigInt(100) })
    })

    test('encode invalid params', () => {
        expect(() => encodeThresholdParams({ threshold: BigInt(-1) })).toThrow(
            'Invalid threshold -1: must be greater than or equal to 0',
        )
    })
})

describe('erc1155 params', () => {
    test('encode invalid params', () => {
        expect(() => encodeERC1155Params({ threshold: BigInt(-1), tokenId: BigInt(100) })).toThrow(
            'Invalid threshold -1: must be greater than or equal to 0',
        )
    })
    test('encode/decode', () => {
        const encodedParams = encodeERC1155Params({ threshold: BigInt(200), tokenId: BigInt(100) })
        const decodedParams = decodeERC1155Params(encodedParams)
        expect(decodedParams).toEqual({ threshold: BigInt(200), tokenId: BigInt(100) })
    })
})

function assertRuleDatasEqual(
    actual: IRuleEntitlementV2Base.RuleDataV2Struct,
    expected: IRuleEntitlementV2Base.RuleDataV2Struct,
) {
    expect(expected.operations.length).toBe(actual.operations.length)
    for (let i = 0; i < expected.operations.length; i++) {
        expect(expected.operations[i].opType).toBe(actual.operations[i].opType)
        expect(expected.operations[i].index).toBe(actual.operations[i].index)
    }
    expect(expected.checkOperations.length).toBe(actual.checkOperations.length)
    for (let i = 0; i < expected.checkOperations.length; i++) {
        console.log('actual check type contents: ', i, actual.checkOperations[i].params)
        expect(expected.checkOperations[i].opType).toBe(actual.checkOperations[i].opType)
        expect(expected.checkOperations[i].chainId).toBe(actual.checkOperations[i].chainId)
        expect(expected.checkOperations[i].contractAddress).toBe(
            actual.checkOperations[i].contractAddress,
        )
        expect(expected.checkOperations[i].params as string).toBe(
            actual.checkOperations[i].params as string,
        )
    }
    expect(expected.logicalOperations.length).toBe(actual.logicalOperations.length)
    for (let i = 0; i < expected.logicalOperations.length; i++) {
        expect(expected.logicalOperations[i].logOpType).toBe(actual.logicalOperations[i].logOpType)
        expect(expected.logicalOperations[i].leftOperationIndex).toBe(
            actual.logicalOperations[i].leftOperationIndex,
        )
    }
}

function assertOperationEqual(actual: Operation, expected: Operation) {
    if (expected.opType === OperationType.CHECK) {
        let actualCheck = actual as CheckOperationV2
        let expectedCheck = expected as CheckOperationV2
        expect(actualCheck.checkType).toBe(expectedCheck.checkType)
        expect(actualCheck.chainId).toBe(expectedCheck.chainId)
        expect(actualCheck.contractAddress).toBe(expectedCheck.contractAddress)
        expect(actualCheck.params).toBe(expectedCheck.params)
    } else if (expected.opType === OperationType.LOGICAL) {
        let actualLogical = actual as LogicalOperation
        let expectedLogical = expected as LogicalOperation
        expect(actualLogical.logicalType).toBe(expectedLogical.logicalType)
        // This check involves some redundance since these element have been visited already,
        // but it ensures that embedded operations in the tree are equal since the
        // operations tree does not use indices, but builds a tree directly.
        assertOperationEqual(actualLogical.leftOperation, expectedLogical.leftOperation)
        assertOperationEqual(actualLogical.rightOperation, expectedLogical.rightOperation)
    } else if (expected.opType === OperationType.NONE) {
        expect(actual.opType).toBe(expected.opType)
    }
}

function assertOperationsEqual(actual: Operation[], expected: Operation[]) {
    expect(expected.length).toBe(actual.length)
    for (let i = 0; i < expected.length; i++) {
        assertOperationEqual(actual[i], expected[i])
    }
}

describe('createOperationsTree', () => {
    test('empty', () => {
        const checkOp: DecodedCheckOperation[] = []
        const tree = createOperationsTree(checkOp)
        expect(tree).toEqual({
            operations: [NoopOperation],
            checkOperations: [],
            logicalOperations: [],
        })

        // Validate conversion of rule data to operations tree (used for evaluation)
        const operations = ruleDataToOperations(tree)
        assertOperationsEqual(operations, [NoopOperation])
    })

    test('single check', () => {
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ERC721,
                chainId: 1n,
                address: MOCK_ADDRESS,
                threshold: BigInt(1),
            },
        ]
        const tree = createOperationsTree(checkOp)

        // Validate the constructed rule data
        assertRuleDatasEqual(tree, {
            operations: [
                {
                    opType: OperationType.CHECK,
                    index: 0,
                },
            ],
            checkOperations: [
                {
                    opType: CheckOperationType.ERC721,
                    chainId: 1n,
                    contractAddress: MOCK_ADDRESS,
                    params: encodeThresholdParams({ threshold: BigInt(1) }),
                },
            ],
            logicalOperations: [],
        })
    })

    test('two checks', () => {
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1n,
                address: MOCK_ADDRESS,
            },
            {
                type: CheckOperationType.ERC721,
                chainId: 1n,
                address: MOCK_ADDRESS_2,
                threshold: BigInt(1),
            },
        ]

        const tree = createOperationsTree(checkOp)

        // Validate the constructed rule data
        assertRuleDatasEqual(tree, {
            operations: [
                {
                    opType: OperationType.CHECK,
                    index: 0,
                },
                {
                    opType: OperationType.CHECK,
                    index: 1,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 0,
                },
            ],
            checkOperations: [
                {
                    opType: CheckOperationType.ISENTITLED,
                    chainId: 1n,
                    contractAddress: MOCK_ADDRESS,
                    params: '0x',
                },
                {
                    opType: CheckOperationType.ERC721,
                    chainId: 1n,
                    contractAddress: MOCK_ADDRESS_2,
                    params: encodeThresholdParams({ threshold: BigInt(1) }),
                },
            ],
            logicalOperations: [
                {
                    logOpType: LogicalOperationType.OR,
                    leftOperationIndex: 0,
                    rightOperationIndex: 1,
                },
            ],
        })

        // Validate conversion of rule data to operations tree (used for evaluation)
        const operations = ruleDataToOperations(tree)

        const check1: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: 1n,
            contractAddress: MOCK_ADDRESS,
            params: '0x',
        }
        const check2: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 1n,
            contractAddress: MOCK_ADDRESS_2,
            params: encodeThresholdParams({ threshold: BigInt(1) }),
        }
        assertOperationsEqual(operations, [
            check1,
            check2,
            {
                opType: OperationType.LOGICAL,
                logicalType: LogicalOperationType.OR,
                leftOperation: check1,
                rightOperation: check2,
            } satisfies LogicalOperation,
        ])
    })

    test('three checks', () => {
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1n,
                address: MOCK_ADDRESS,
            },
            {
                type: CheckOperationType.ERC721,
                chainId: 2n,
                address: MOCK_ADDRESS_2,
                threshold: BigInt(1),
            },
            {
                type: CheckOperationType.ERC20,
                chainId: 3n,
                address: MOCK_ADDRESS_3,
                threshold: BigInt(1),
            },
        ]

        const tree = createOperationsTree(checkOp)

        // Validate the constructed rule data
        assertRuleDatasEqual(tree, {
            operations: [
                {
                    opType: OperationType.CHECK,
                    index: 0,
                },
                {
                    opType: OperationType.CHECK,
                    index: 1,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 0,
                },
                {
                    opType: OperationType.CHECK,
                    index: 2,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 1,
                },
            ],
            checkOperations: [
                {
                    opType: CheckOperationType.ISENTITLED,
                    chainId: 1n,
                    contractAddress: MOCK_ADDRESS,
                    params: '0x',
                },
                {
                    opType: CheckOperationType.ERC721,
                    chainId: 2n,
                    contractAddress: MOCK_ADDRESS_2,
                    params: encodeThresholdParams({ threshold: BigInt(1) }),
                },
                {
                    opType: CheckOperationType.ERC20,
                    chainId: 3n,
                    contractAddress: MOCK_ADDRESS_3,
                    params: encodeThresholdParams({ threshold: BigInt(1) }),
                },
            ],
            logicalOperations: [
                {
                    logOpType: LogicalOperationType.OR,
                    leftOperationIndex: 0,
                    rightOperationIndex: 1,
                },
                {
                    logOpType: LogicalOperationType.OR,
                    leftOperationIndex: 2,
                    rightOperationIndex: 3,
                },
            ],
        })

        // Validate conversion of rule data to operations tree (used for evaluation)
        const operations = ruleDataToOperations(tree)

        const check1: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: 1n,
            contractAddress: MOCK_ADDRESS,
            params: '0x',
        }
        const check2: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 2n,
            contractAddress: MOCK_ADDRESS_2,
            params: encodeThresholdParams({ threshold: BigInt(1) }),
        }
        const check3: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC20,
            chainId: 3n,
            contractAddress: MOCK_ADDRESS_3,
            params: encodeThresholdParams({ threshold: BigInt(1) }),
        }

        const logical1: LogicalOperation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: check1,
            rightOperation: check2,
        }

        const logical2: LogicalOperation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: logical1,
            rightOperation: check3,
        }

        assertOperationsEqual(operations, [check1, check2, logical1, check3, logical2])
    })
})
