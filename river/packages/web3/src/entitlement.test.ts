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
    XchainConfig,
    EncodedNoopRuleData,
    DecodedCheckOperationBuilder,
    evaluateOperationsForEntitledWallet,
} from './entitlement'
import {
    MOCK_ADDRESS,
    MOCK_ADDRESS_2,
    MOCK_ADDRESS_3,
    MOCK_ADDRESS_4,
    MOCK_ADDRESS_5,
} from './Utils'
import { zeroAddress } from 'viem'
import { Address } from './ContractTypes'
import { convertRuleDataV2ToV1 } from './ConvertersEntitlements'
import { IRuleEntitlementV2Base } from './v3/IRuleEntitlementV2Shim'

import debug from 'debug'

const log = debug('test')

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

it('random', async () => {
    const operation = makeRandomOperation(0)
    // it takes a Uint8Array and returns a Uint8Array
    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
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

const xchainConfig: XchainConfig = {
    supportedRpcUrls: {
        [Number(ethereumSepoliaChainId)]: 'https://ethereum-sepolia-rpc.publicnode.com',
        [Number(baseSepoliaChainId)]: 'https://sepolia.base.org',
    },
    etherBasedChains: [Number(ethereumSepoliaChainId), Number(baseSepoliaChainId)],
}

const minimalEtherChainsConfig: XchainConfig = {
    supportedRpcUrls: {
        [Number(ethereumSepoliaChainId)]: 'https://ethereum-sepolia-rpc.publicnode.com',
        [Number(baseSepoliaChainId)]: 'https://sepolia.base.org',
    },
    etherBasedChains: [Number(ethereumSepoliaChainId)],
}

const nftCases = [
    {
        desc: 'base sepolia',
        check: nftCheckBaseSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        expectedResult: true,
    },
    {
        desc: 'base sepolia (no tokens)',
        check: nftCheckBaseSepolia,
        wallets: [ethers.constants.AddressZero],
        expectedResult: false,
    },
    {
        desc: 'base sepolia (insufficient balance)',
        check: nftMultiCheckBaseSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
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
        expectedResult: false,
    },

    {
        desc: 'eth sepolia',
        check: nftCheckEthereumSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (no tokens)',
        check: nftCheckEthereumSepolia,
        wallets: [ethers.constants.AddressZero],
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (insufficient balance)',
        check: nftMultiCheckEthereumSepolia,
        wallets: [SepoliaTestNftWallet_1Token],
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
        expectedResult: false,
    },
]

it.concurrent.each(nftCases)('erc721Check - $desc', async (props) => {
    const { check, wallets, expectedResult } = props
    const controller = new AbortController()

    const result = await evaluateTree(controller, wallets, xchainConfig, check)
    if (expectedResult) {
        expect(result as Address).toBeTruthy()
        expect(result).not.toEqual(zeroAddress)
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
const baseSepoliaChainLinkWallet_25Link2: Address = '0x4BCfC6962Ab0297aF801da21216014F53B46E991'
const baseSepoliaChainLinkWallet_25Link: Address = '0xa4D440AeA5F555feEB5AEa0ddcED6e1B9FaD6A9C'
const testEmptyAccount: Address = '0xb227905F186095083869928BAb49cA9CE9546817'

// This wallet has .4ETH on Sepolia, and .1ETH on Base Sepolia
const ethWallet_0_5Eth = '0x3ef41b0469c1B808Caad9d643F596023e2aa8f11'
// This wallet has .1ETH on Sepolia, and .1ETH on Base Sepolia
const ethWallet_0_2Eth = '0x4BD04Bf2AAC02238bCcFA75D7bc4Cfd2c019c331'

const chainlinkExp = BigInt(10) ** BigInt(18)

// ERC1155 test contracts and wallets
const baseSepoliaErc1155Contract = '0x60327B4F2936E02B910e8A236d46D0B7C1986DCB'
const baseSepoliaErc1155Wallet_TokenId0_700Tokens = '0x1FDBA84c2153568bc22686B88B617CF64cdb0637'
const baseSepoliaErc1155Wallet_TokenId0_300Tokens = '0xB79Af997239A334355F60DBeD75bEDf30AcD37bD'
const baseSepoliaErc1155Wallet_TokenId1_100Tokens = '0x1FDBA84c2153568bc22686B88B617CF64cdb0637'
const baseSepoliaErc1155Wallet_TokenId1_50Tokens = '0xB79Af997239A334355F60DBeD75bEDf30AcD37bD'

const ethBalance_gt_0_7: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ETH_BALANCE,
    chainId: ethereumSepoliaChainId,
    contractAddress: ethers.constants.AddressZero,
    params: encodeThresholdParams({ threshold: 700_000_000_000_000_001n }),
}

const ethBalance_0_7: CheckOperationV2 = {
    ...ethBalance_gt_0_7,
    params: encodeThresholdParams({ threshold: 700_000_000_000_000_000n }),
}

const ethBalance_0_5: CheckOperationV2 = {
    ...ethBalance_gt_0_7,
    params: encodeThresholdParams({ threshold: 500_000_000_000_000_000n }),
}

const ethBalance_0_4: CheckOperationV2 = {
    ...ethBalance_gt_0_7,
    params: encodeThresholdParams({ threshold: 400_000_000_000_000_000n }),
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

const erc20ChainLinkCheckBaseSepolia_50Tokens: CheckOperationV2 = {
    ...erc20ChainLinkCheckBaseSepolia_20Tokens,
    params: encodeThresholdParams({ threshold: 50n * chainlinkExp }),
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

const erc1155CheckBaseSepolia_TokenId0_700Tokens: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC1155,
    chainId: baseSepoliaChainId,
    contractAddress: baseSepoliaErc1155Contract,
    params: encodeERC1155Params({ threshold: 700n, tokenId: 0n }),
}

const erc1155CheckBaseSepolia_TokenId0_1000Tokens: CheckOperationV2 = {
    ...erc1155CheckBaseSepolia_TokenId0_700Tokens,
    params: encodeERC1155Params({ threshold: 1000n, tokenId: 0n }),
}

const erc1155CheckBaseSepolia_TokenId0_1001Tokens: CheckOperationV2 = {
    ...erc1155CheckBaseSepolia_TokenId0_700Tokens,
    params: encodeERC1155Params({ threshold: 1001n, tokenId: 0n }),
}

const erc1155CheckBaseSepolia_TokenId1_100Tokens: CheckOperationV2 = {
    opType: OperationType.CHECK,
    checkType: CheckOperationType.ERC1155,
    chainId: baseSepoliaChainId,
    contractAddress: baseSepoliaErc1155Contract,
    params: encodeERC1155Params({ threshold: 100n, tokenId: 1n }),
}

const erc1155CheckBaseSepolia_TokenId1_150Tokens: CheckOperationV2 = {
    ...erc1155CheckBaseSepolia_TokenId1_100Tokens,
    params: encodeERC1155Params({ threshold: 150n, tokenId: 1n }),
}

const erc1155CheckBaseSepolia_TokenId1_151Tokens: CheckOperationV2 = {
    ...erc1155CheckBaseSepolia_TokenId1_100Tokens,
    params: encodeERC1155Params({ threshold: 151n, tokenId: 1n }),
}

const erc1155Cases = [
    {
        desc: 'base sepolia token id 0 (no wallets)',
        check: erc1155CheckBaseSepolia_TokenId0_700Tokens,
        wallets: [],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 0 (single wallet, insufficient balance)',
        check: erc1155CheckBaseSepolia_TokenId0_700Tokens,
        wallets: [baseSepoliaErc1155Wallet_TokenId0_300Tokens],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 0 (single wallet)',
        check: erc1155CheckBaseSepolia_TokenId0_700Tokens,
        wallets: [baseSepoliaErc1155Wallet_TokenId0_700Tokens],
        expectedResult: true,
    },
    {
        desc: 'base sepolia token id 0 (multiwallet, insufficient balance)',
        check: erc1155CheckBaseSepolia_TokenId0_1001Tokens,
        wallets: [
            baseSepoliaErc1155Wallet_TokenId0_700Tokens,
            baseSepoliaErc1155Wallet_TokenId0_300Tokens,
        ],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 0 (multiwallet)',
        check: erc1155CheckBaseSepolia_TokenId0_1000Tokens,
        wallets: [
            baseSepoliaErc1155Wallet_TokenId0_700Tokens,
            baseSepoliaErc1155Wallet_TokenId0_300Tokens,
        ],
        expectedResult: true,
    },
    {
        desc: 'base sepolia token id 1 (no wallets)',
        check: erc1155CheckBaseSepolia_TokenId1_100Tokens,
        wallets: [],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 1 (single wallet, insufficient balance)',
        check: erc1155CheckBaseSepolia_TokenId1_100Tokens,
        wallets: [baseSepoliaErc1155Wallet_TokenId1_50Tokens],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 1 (single wallet)',
        check: erc1155CheckBaseSepolia_TokenId1_100Tokens,
        wallets: [baseSepoliaErc1155Wallet_TokenId1_100Tokens],
        expectedResult: true,
    },
    {
        desc: 'base sepolia token id 1 (multiwallet, insufficient balance)',
        check: erc1155CheckBaseSepolia_TokenId1_151Tokens,
        wallets: [
            baseSepoliaErc1155Wallet_TokenId1_100Tokens,
            baseSepoliaErc1155Wallet_TokenId1_50Tokens,
        ],
        expectedResult: false,
    },
    {
        desc: 'base sepolia token id 1 (multiwallet)',
        check: erc1155CheckBaseSepolia_TokenId1_150Tokens,
        wallets: [
            baseSepoliaErc1155Wallet_TokenId1_100Tokens,
            baseSepoliaErc1155Wallet_TokenId1_50Tokens,
        ],
        expectedResult: true,
    },
]

it.concurrent.each(erc1155Cases)('ERC1155 Check - $desc', async (props) => {
    const { check, wallets, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, xchainConfig, check)
    if (expectedResult) {
        expect(result).not.toEqual(zeroAddress)
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

const ethBalanceCases = [
    {
        desc: 'eth balance with no wallet',
        check: ethBalance_0_5,
        wallets: [],
        expectedResult: false,
    },
    {
        desc: 'Eth balance across chains',
        check: ethBalance_0_5,
        wallets: [ethWallet_0_5Eth],
        expectedResult: true,
    },
    {
        desc: 'Eth balance across chains (insufficient balance)',
        check: ethBalance_0_5,
        wallets: [ethWallet_0_2Eth],
        expectedResult: false,
    },
    {
        desc: 'Eth balance across chains (multiwallet)',
        check: ethBalance_0_7,
        wallets: [ethWallet_0_5Eth, ethWallet_0_2Eth],
        expectedResult: true,
    },
    {
        desc: 'Eth balance across chains (multiwallet, insufficient balance)',
        check: ethBalance_gt_0_7,
        wallets: [ethWallet_0_5Eth, ethWallet_0_2Eth],
        expectedResult: false,
    },
]

it.concurrent.each(ethBalanceCases)('Eth Balance Check - $desc', async (props) => {
    const { check, wallets, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, xchainConfig, check)
    if (expectedResult) {
        expect(result as Address).toBeTruthy()
        expect(result).not.toEqual(zeroAddress)
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

const ethBalanceCasesMinimalEtherChains = [
    {
        desc: 'positive result',
        check: ethBalance_0_4,
        wallets: [ethWallet_0_5Eth],
        expectedResult: true,
    },
    {
        desc: 'negative result',
        check: ethBalance_0_5,
        wallets: [ethWallet_0_5Eth],
        expectedResult: false,
    },
]

it.concurrent.each(ethBalanceCasesMinimalEtherChains)(
    'Eth Balance Check - Ether chains < xChain supported chains - $desc',
    async (props) => {
        const { check, wallets, expectedResult } = props
        const controller = new AbortController()
        const result = await evaluateTree(controller, wallets, minimalEtherChainsConfig, check)
        if (expectedResult) {
            expect(result as Address).toBeTruthy()
            expect(result).not.toEqual(zeroAddress)
        } else {
            expect(result).toEqual(zeroAddress)
        }
    },
)

const erc20Cases = [
    {
        desc: 'base sepolia (empty wallet, false)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [testEmptyAccount],
        expectedResult: false,
    },
    {
        desc: 'base sepolia (single wallet)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link],
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two wallets)',
        check: erc20ChainLinkCheckBaseSepolia_20Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, testEmptyAccount],
        expectedResult: true,
    },
    {
        desc: 'base sepolia (false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link],
        expectedResult: false,
    },
    {
        desc: 'base sepolia (two wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, testEmptyAccount],
        expectedResult: false,
    },
    {
        desc: 'base sepolia (two nonempty wallets, true)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_25Link2],
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two nonempty wallets, exact balance - true)',
        check: erc20ChainLinkCheckBaseSepolia_50Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_25Link2],
        expectedResult: true,
    },
    {
        desc: 'base sepolia (two nonempty wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_90Tokens,
        wallets: [baseSepoliaChainLinkWallet_25Link, baseSepoliaChainLinkWallet_25Link2],
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (empty wallet, false)',
        check: erc20ChainLinkCheckEthereumSepolia_30Tokens,
        wallets: [testEmptyAccount],
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (single wallet)',
        check: erc20ChainLinkEthereumSepolia_20Tokens,
        wallets: [sepoliaChainLinkWallet_25Link],
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (two wallets)',
        check: erc20ChainLinkEthereumSepolia_20Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, testEmptyAccount],
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [sepoliaChainLinkWallet_25Link],
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (two wallets, false)',
        check: erc20ChainLinkCheckBaseSepolia_30Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, testEmptyAccount],
        expectedResult: false,
    },
    {
        desc: 'eth sepolia (two nonempty wallets, exact balance - true)',
        check: erc20ChainLinkCheckEthereumSepolia_75Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, sepoliaChainLinkWallet_50Link],
        expectedResult: true,
    },
    {
        desc: 'eth sepolia (two nonempty wallets, false)',
        check: erc20ChainLinkCheckEthereumSepolia_90Tokens,
        wallets: [sepoliaChainLinkWallet_25Link, sepoliaChainLinkWallet_50Link],
        expectedResult: false,
    },
]

it.concurrent.each(erc20Cases)('erc20Check - $desc', async (props) => {
    const { check, wallets, expectedResult } = props
    const controller = new AbortController()
    const result = await evaluateTree(controller, wallets, xchainConfig, check)
    if (expectedResult) {
        expect(result as Address).toBeTruthy()
        expect(result).not.toEqual(zeroAddress)
    } else {
        expect(result).toEqual(zeroAddress)
    }
})

const errorTests = [
    {
        desc: 'unknown check type',
        check: {
            ...erc20ChainLinkCheckBaseSepolia_20Tokens,
            checkType: CheckOperationType.NONE,
        },
        error: 'Unknown check operation type',
    },
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
        error: 'Invalid contract address for check operation ERC20',
    },
    {
        desc: 'erc20 invalid check (threshold)',
        check: {
            ...erc20ChainLinkCheckBaseSepolia_20Tokens,
            params: encodeThresholdParams({ threshold: 0n }),
        },
        error: 'Invalid threshold for check operation ERC20',
    },
    {
        desc: 'erc721 invalid check (chainId)',
        check: {
            ...nftCheckBaseSepolia,
            opType: OperationType.CHECK,
            chainId: -1n,
        },
        error: 'Invalid chain id for check operation ERC721',
    },
    {
        desc: 'erc721 invalid check (contractAddress)',
        check: {
            ...nftCheckBaseSepolia,
            opType: OperationType.CHECK,
            contractAddress: ethers.constants.AddressZero as Address,
        },
        error: 'Invalid contract address for check operation ERC721',
    },
    {
        desc: 'erc721 invalid check (threshold)',
        check: {
            ...nftCheckBaseSepolia,
            opType: OperationType.CHECK,
            params: encodeThresholdParams({ threshold: 0n }),
        },
        error: 'Invalid threshold for check operation ERC721',
    },
    {
        desc: 'cross chain entitlement invalid check (chainId)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: -1n,
            contractAddress: nftCheckBaseSepolia.contractAddress,
        },
        error: 'Invalid chain id for check operation ISENTITLED',
    },
    {
        desc: 'cross chain entitlement invalid check (contractAddress)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: 1n,
            contractAddress: ethers.constants.AddressZero as Address,
        },
        error: 'Invalid contract address for check operation ISENTITLED',
    },
    {
        desc: 'erc1155 invalid check (chainId)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC1155,
            chainId: -1n,
            contractAddress: MOCK_ADDRESS,
            params: encodeERC1155Params({ tokenId: 1n, threshold: 1n }),
        },
        error: 'Invalid chain id for check operation ERC1155',
    },
    {
        desc: 'erc 1155 invalid check (contractAddress)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC1155,
            chainId: 1n,
            contractAddress: ethers.constants.AddressZero as Address,
        },
        error: 'Invalid contract address for check operation ERC1155',
    },
    {
        desc: 'erc1155 invalid check (threshold)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC1155,
            chainId: 1n,
            contractAddress: MOCK_ADDRESS,
            params: encodeERC1155Params({ tokenId: 1n, threshold: 0n }),
        },
        error: 'Invalid threshold for check operation ERC1155',
    },
    {
        desc: 'eth balance invalid check (invalid threshold: 0)',
        check: {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ETH_BALANCE,
            chainId: 0n,
            contractAddress: zeroAddress,
            params: encodeThresholdParams({ threshold: 0n }),
        },
        error: 'Invalid threshold for check operation ETH_BALANCE',
    },
]

it.concurrent.each(errorTests)('error - $desc', async (props) => {
    const { check, error } = props
    const controller = new AbortController()
    await expect(
        evaluateTree(
            controller,
            [SepoliaTestNftWallet_1Token],
            xchainConfig,
            check as CheckOperationV2,
        ),
    ).rejects.toThrow(error)
})

const orCases = [
    { leftCheck: trueCheck, rightCheck: trueCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: trueCheck, rightCheck: falseCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: falseCheck, rightCheck: trueCheck, expectedResult: MOCK_ADDRESS },
    { leftCheck: falseCheck, rightCheck: falseCheck, expectedResult: ethers.constants.AddressZero },
]

it.concurrent.each(orCases)('orOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult } = props
    const orOperation: OrOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.OR,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, orOperation)
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

it.concurrent.each(slowOrCases)('slowOrOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation: OrOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.OR,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const start = performance.now()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
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

it.concurrent.each(andCases)('andOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult } = props
    const operation: AndOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.AND,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
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

it.concurrent.each(slowAndCases)('slowAndOperation', async (props) => {
    const { leftCheck, rightCheck, expectedResult, expectedTime } = props
    const operation: AndOperation = {
        opType: OperationType.LOGICAL,
        logicalType: LogicalOperationType.AND,
        leftOperation: leftCheck,
        rightOperation: rightCheck,
    } as const

    const controller = new AbortController()
    const start = performance.now()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
    const timeTaken = performance.now() - start

    expect(result).toBe(expectedResult)
    expect(timeTaken).toBeCloseTo(expectedTime, -2)
})

it('empty', async () => {
    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, undefined)
    expect(result).toBe(ethers.constants.AddressZero)
})

it('true', async () => {
    const operation = trueCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
    expect(result).toBe(MOCK_ADDRESS)
})

it('false', async () => {
    const operation = falseCheck

    const controller = new AbortController()
    const result = await evaluateTree(controller, [], xchainConfig, operation)
    expect(result).toBe(ethers.constants.AddressZero)
})

it('encode/decode rule data v2', async () => {
    const randomTree = makeRandomOperation(5)

    const data = treeToRuleData(randomTree)
    const encoded = encodeRuleDataV2(data)

    const decodedDag = decodeRuleDataV2(encoded)
    const operations = ruleDataToOperations(decodedDag)
    const newTree = postOrderArrayToTree(operations)
    expect(randomTree.opType === newTree.opType).toBeTruthy()
})

it('decode empty ruledata v2 to NoopRuleData v1', async () => {
    const converted = convertRuleDataV2ToV1(decodeRuleDataV2(EncodedNoopRuleData))
    expect(converted.operations).toHaveLength(0)
    expect(converted.checkOperations).toHaveLength(0)
    expect(converted.logicalOperations).toHaveLength(0)
})

// encode/decode should respect address equality semantics but may not maintain case
function addressesEqual(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase()
}

it('encode/decode rule data', async () => {
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

describe.concurrent('threshold params', () => {
    it('encode/decode', () => {
        const encodedParams = encodeThresholdParams({ threshold: BigInt(100) })
        const decodedParams = decodeThresholdParams(encodedParams)
        expect(decodedParams).toEqual({ threshold: BigInt(100) })
    })

    it('encode invalid params', () => {
        expect(() => encodeThresholdParams({ threshold: BigInt(-1) })).toThrow(
            'Invalid threshold -1: must be greater than or equal to 0',
        )
    })
})

describe.concurrent('erc1155 params', () => {
    it('encode invalid params', () => {
        expect(() => encodeERC1155Params({ threshold: BigInt(-1), tokenId: BigInt(100) })).toThrow(
            'Invalid threshold -1: must be greater than or equal to 0',
        )
    })

    it('encode invalid token id', () => {
        expect(() => encodeERC1155Params({ threshold: BigInt(100), tokenId: BigInt(-1) })).toThrow(
            'Invalid tokenId -1: must be greater than or equal to 0',
        )
    })

    it('encode/decode', () => {
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
    expect(actual.opType).toBe(expected.opType)
    if (expected.opType === OperationType.CHECK) {
        const actualCheck = actual as CheckOperationV2
        const expectedCheck = expected
        expect(actualCheck.checkType).toBe(expectedCheck.checkType)
        expect(actualCheck.chainId).toBe(expectedCheck.chainId)
        expect(actualCheck.contractAddress).toBe(expectedCheck.contractAddress)
        expect(actualCheck.params).toBe(expectedCheck.params)
    } else if (expected.opType === OperationType.LOGICAL) {
        const actualLogical = actual as LogicalOperation
        const expectedLogical = expected
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

describe.concurrent('createOperationsTree', () => {
    it('empty', () => {
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

    it('custom entitlement check', () => {
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1234n,
                address: MOCK_ADDRESS,
                byteEncodedParams: `0xdeadbeefdeadbeef12341234`,
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
                    opType: CheckOperationType.ISENTITLED,
                    chainId: 1234n,
                    contractAddress: MOCK_ADDRESS,
                    params: `0xdeadbeefdeadbeef12341234`,
                },
            ],
            logicalOperations: [],
        })
    })

    it('single check', () => {
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

    it('two checks', () => {
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

    it('three checks', () => {
        /*
                       3-check tree:
                       ============

                         logical2
                         --------
                        /         \
                    logical1    check3
                    --------
                    /       \
                 check1   check2

        Postorder: check1, check2, logical1, check3, logical2
        */
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1n,
                address: MOCK_ADDRESS,
                byteEncodedParams: `0xabcdef`,
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
                    params: '0xabcdef',
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
            params: '0xabcdef',
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

    it('five checks', () => {
        /*
                            5-check tree:
                            =============

                               logical4
                               --------
                             /          \
                         logical3      check5
                         --------
                        /         \
                logical1           logical2
                --------           --------
               /        \         /        \
            check1    check2   check3    check4

        Postorder: check1, check2, logical1, check3, check4, logical2, logical3, check5, logical4
        */
        const checkOp: DecodedCheckOperation[] = [
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1n,
                address: MOCK_ADDRESS,
                byteEncodedParams: `0xabcdef`,
            },
            {
                type: CheckOperationType.ERC721,
                chainId: 2n,
                address: MOCK_ADDRESS_2,
                threshold: BigInt(2),
            },
            {
                type: CheckOperationType.ERC20,
                chainId: 3n,
                address: MOCK_ADDRESS_3,
                threshold: BigInt(3),
            },
            {
                type: CheckOperationType.ERC721,
                chainId: 4n,
                address: MOCK_ADDRESS_4,
                threshold: BigInt(4),
            },
            {
                type: CheckOperationType.ERC20,
                chainId: 5n,
                address: MOCK_ADDRESS_5,
                threshold: BigInt(5),
            },
        ]

        const tree = createOperationsTree(checkOp)

        // Validate the constructed rule data
        log('tree', tree)

        const expectedTree = {
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
                    opType: OperationType.CHECK,
                    index: 3,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 1,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 2,
                },
                {
                    opType: OperationType.CHECK,
                    index: 4,
                },
                {
                    opType: OperationType.LOGICAL,
                    index: 3,
                },
            ],
            checkOperations: [
                {
                    opType: CheckOperationType.ISENTITLED,
                    chainId: 1n,
                    contractAddress: MOCK_ADDRESS,
                    params: '0xabcdef',
                },
                {
                    opType: CheckOperationType.ERC721,
                    chainId: 2n,
                    contractAddress: MOCK_ADDRESS_2,
                    params: encodeThresholdParams({ threshold: BigInt(2) }),
                },
                {
                    opType: CheckOperationType.ERC20,
                    chainId: 3n,
                    contractAddress: MOCK_ADDRESS_3,
                    params: encodeThresholdParams({ threshold: BigInt(3) }),
                },
                {
                    opType: CheckOperationType.ERC721,
                    chainId: 4n,
                    contractAddress: MOCK_ADDRESS_4,
                    params: encodeThresholdParams({ threshold: BigInt(4) }),
                },
                {
                    opType: CheckOperationType.ERC20,
                    chainId: 5n,
                    contractAddress: MOCK_ADDRESS_5,
                    params: encodeThresholdParams({ threshold: BigInt(5) }),
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
                    leftOperationIndex: 3,
                    rightOperationIndex: 4,
                },
                {
                    logOpType: LogicalOperationType.OR,
                    leftOperationIndex: 2,
                    rightOperationIndex: 5,
                },
                {
                    logOpType: LogicalOperationType.OR,
                    leftOperationIndex: 6,
                    rightOperationIndex: 7,
                },
            ],
        }

        assertRuleDatasEqual(tree, expectedTree)

        // Validate conversion of rule data to operations tree (used for evaluation)
        const operations = ruleDataToOperations(tree)

        const check1: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ISENTITLED,
            chainId: 1n,
            contractAddress: MOCK_ADDRESS,
            params: '0xabcdef',
        }
        const check2: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 2n,
            contractAddress: MOCK_ADDRESS_2,
            params: encodeThresholdParams({ threshold: BigInt(2) }),
        }
        const check3: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC20,
            chainId: 3n,
            contractAddress: MOCK_ADDRESS_3,
            params: encodeThresholdParams({ threshold: BigInt(3) }),
        }
        const check4: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 4n,
            contractAddress: MOCK_ADDRESS_4,
            params: encodeThresholdParams({ threshold: BigInt(4) }),
        }
        const check5: CheckOperationV2 = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC20,
            chainId: 5n,
            contractAddress: MOCK_ADDRESS_5,
            params: encodeThresholdParams({ threshold: BigInt(5) }),
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
            leftOperation: check3,
            rightOperation: check4,
        }

        const logical3: LogicalOperation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: logical1,
            rightOperation: logical2,
        }

        const logical4: LogicalOperation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: logical3,
            rightOperation: check5,
        }

        const expectedOperations = [
            check1,
            check2,
            logical1,
            check3,
            check4,
            logical2,
            logical3,
            check5,
            logical4,
        ]

        assertOperationsEqual(operations, expectedOperations)
    })
})

describe.concurrent('evaluateOperationsForEntitledWallet', () => {
    it.concurrent('4 checks - evaluateOperationsForEntitledWallet', async () => {
        const checkOp: DecodedCheckOperation[] = [
            // pass
            {
                type: CheckOperationType.ERC1155,
                chainId: baseSepoliaChainId,
                address: baseSepoliaErc1155Contract,
                threshold: BigInt(700),
                tokenId: 0n,
            },
            // fail
            {
                type: CheckOperationType.ISENTITLED,
                chainId: 1n,
                address: MOCK_ADDRESS,
                byteEncodedParams: `0xabcdef`,
            },
            // fail
            {
                type: CheckOperationType.ERC1155,
                chainId: baseSepoliaChainId,
                address: baseSepoliaErc1155Contract,
                threshold: BigInt(900),
                tokenId: 0n,
            },
            // fail
            {
                type: CheckOperationType.ERC1155,
                chainId: baseSepoliaChainId,
                address: baseSepoliaErc1155Contract,
                threshold: BigInt(10_000),
                tokenId: 1n,
            },
        ]

        const tree = createOperationsTree(checkOp)
        const operations = ruleDataToOperations(tree)

        // if evaluateOperationsForEntitledWallet does not internally create a postOrderArrayToTree,
        // this will fail past a threshold of 4 Check operations
        const result = await evaluateOperationsForEntitledWallet(
            operations,
            [baseSepoliaErc1155Wallet_TokenId0_700Tokens],
            xchainConfig,
        )
        expect(result).not.toEqual(zeroAddress)
    })
})

describe.concurrent('DecodedCheckOpBuilder', () => {
    it('Untyped', () => {
        expect(() => {
            new DecodedCheckOperationBuilder().build()
        }).toThrow('DecodedCheckOperation requires a type')
    })

    it('ERC20s', () => {
        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC20)
                .setAddress(zeroAddress)
                .setThreshold(1n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC20 requires a chainId')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC20)
                .setChainId(1n)
                .setThreshold(1n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC20 requires an address')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC20)
                .setChainId(1n)
                .setAddress(zeroAddress)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC20 requires a threshold')

        // Valid example
        const decoded = new DecodedCheckOperationBuilder()
            .setType(CheckOperationType.ERC20)
            .setChainId(1n)
            .setAddress(zeroAddress)
            .setThreshold(5n)
            .build()

        expect(decoded).toEqual({
            type: CheckOperationType.ERC20,
            chainId: 1n,
            address: zeroAddress,
            threshold: 5n,
        } as DecodedCheckOperation)
    })

    it('ERC721s', () => {
        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC721)
                .setAddress(zeroAddress)
                .setThreshold(1n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC721 requires a chainId')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC721)
                .setChainId(1n)
                .setThreshold(1n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC721 requires an address')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC721)
                .setChainId(1n)
                .setAddress(zeroAddress)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC721 requires a threshold')

        // Valid example
        const decoded = new DecodedCheckOperationBuilder()
            .setType(CheckOperationType.ERC721)
            .setChainId(1n)
            .setAddress(zeroAddress)
            .setThreshold(5n)
            .build()

        expect(decoded).toEqual({
            type: CheckOperationType.ERC721,
            chainId: 1n,
            address: zeroAddress,
            threshold: 5n,
        } as DecodedCheckOperation)
    })

    it('ERC1155s', () => {
        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC1155)
                .setAddress(zeroAddress)
                .setThreshold(1n)
                .setTokenId(5n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC1155 requires a chainId')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC1155)
                .setChainId(1n)
                .setThreshold(1n)
                .setTokenId(5n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC1155 requires an address')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC1155)
                .setChainId(1n)
                .setAddress(zeroAddress)
                .setTokenId(5n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC1155 requires a threshold')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ERC1155)
                .setChainId(1n)
                .setAddress(zeroAddress)
                .setThreshold(3n)
                .build()
        }).toThrow('DecodedCheckOperation of type ERC1155 requires a tokenId')

        // Valid example
        const decoded = new DecodedCheckOperationBuilder()
            .setType(CheckOperationType.ERC1155)
            .setChainId(1n)
            .setAddress(zeroAddress)
            .setThreshold(5n)
            .setTokenId(9n)
            .build()

        expect(decoded).toEqual({
            type: CheckOperationType.ERC1155,
            chainId: 1n,
            address: zeroAddress,
            threshold: 5n,
            tokenId: 9n,
        } as DecodedCheckOperation)
    })

    it('ETH_BALANCE', () => {
        expect(() => {
            new DecodedCheckOperationBuilder().setType(CheckOperationType.ETH_BALANCE).build()
        }).toThrow('DecodedCheckOperation of type ETH_BALANCE requires a threshold')

        // Valid example
        const decoded = new DecodedCheckOperationBuilder()
            .setType(CheckOperationType.ETH_BALANCE)
            .setThreshold(5n)
            .build()

        expect(decoded).toEqual({
            type: CheckOperationType.ETH_BALANCE,
            threshold: 5n,
        } as DecodedCheckOperation)
    })

    it('ISENTITLED', () => {
        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ISENTITLED)
                .setAddress(zeroAddress)
                .setByteEncodedParams('0xabcdef1234')
                .build()
        }).toThrow('DecodedCheckOperation of type ISENTITLED requires a chainId')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ISENTITLED)
                .setChainId(1n)
                .setByteEncodedParams('0xabcdef1234')
                .build()
        }).toThrow('DecodedCheckOperation of type ISENTITLED requires an address')

        expect(() => {
            new DecodedCheckOperationBuilder()
                .setType(CheckOperationType.ISENTITLED)
                .setChainId(1n)
                .setAddress(zeroAddress)
                .build()
        }).toThrow('DecodedCheckOperation of type ISENTITLED requires byteEncodedParams')

        // Valid example
        const decoded = new DecodedCheckOperationBuilder()
            .setType(CheckOperationType.ISENTITLED)
            .setChainId(1n)
            .setAddress(zeroAddress)
            .setByteEncodedParams('0xabcdef1234')
            .build()

        expect(decoded).toEqual({
            type: CheckOperationType.ISENTITLED,
            chainId: 1n,
            address: zeroAddress,
            byteEncodedParams: `0xabcdef1234`,
        } as DecodedCheckOperation)
    })
})
