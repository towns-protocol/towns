import { createSmartAccountClient } from 'permissionless'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import {
    Chain,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    http,
    isAddress,
    LocalAccount,
    parseEther,
    zeroAddress,
} from 'viem'
import { entryPoint06Address, entryPoint07Address } from 'viem/account-abstraction'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { waitForTransactionReceipt } from 'viem/actions'
import { foundry, baseSepolia } from 'viem/chains'
import { expect, test } from 'vitest'
import { determineSmartAccount } from '../src/lib/permissionless/accounts/determineSmartAccount'
import { ownerAbi, upgradeAbi } from '../src/lib/permissionless/accounts/simple/abi'
import { semiModularAccountStorageAbi } from '../src/lib/permissionless/accounts/modular/abis/semiModularAccountStorageAbi'
import { toModularSmartAccount } from '../src/lib/permissionless/accounts/modular/toModularAccount'
import { getDefaultSMAV2StorageAddress } from '../src/lib/permissionless/accounts/modular/utils'
import { semiModularAccountBytecodeAbi } from '../src/lib/permissionless/accounts/modular/abis/semiModularBytecodeAbi'

const ALCHEMY = false
const RPC_URL = ALCHEMY
    ? 'https://base-sepolia.g.alchemy.com/v2/GC5aXv-L_eF9NB1rPw86DfFVAGklSTc8'
    : 'http://localhost:8545'
const BUNDLER_RPC_URL = ALCHEMY
    ? 'https://base-sepolia.g.alchemy.com/v2/GC5aXv-L_eF9NB1rPw86DfFVAGklSTc8'
    : 'http://localhost:43370'

// i tested this with alchemy, i can add my key, but for now i'll skip it
const THROWAWAY_PRIVATE_KEY_THIS_HAS_LEAKED_ANYWAY = '0xdeadbeef'

const ANVIL_FUNDED_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

const getPrivateKey = () =>
    ALCHEMY ? THROWAWAY_PRIVATE_KEY_THIS_HAS_LEAKED_ANYWAY : ANVIL_FUNDED_KEY

const fundedAccount = privateKeyToAccount(getPrivateKey())

const getChain = () => (ALCHEMY ? baseSepolia : foundry)

const fundedWallet = createWalletClient({
    account: fundedAccount,
    chain: getChain(),
    transport: http(RPC_URL),
})

// these tests are for testing determineSmartAccount and upgrade behavior
// outside of the UserOperations context, it's easier to see exactly what the path should be
test('a deployed simple account can be upgraded to a modular account', async () => {
    const publicClient = createPublicClient({
        chain: getChain(),
        transport: http(RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    //////////////////////////////////////////////////////////////
    // create simple account
    //////////////////////////////////////////////////////////////
    const simpleAccountAddress = await determineSmartAccount({
        newAccountImplementationType: 'simple',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const simpleAccount = await toSimpleSmartAccount({
        client: publicClient,
        address: simpleAccountAddress.address,
        owner,
        nonceKey: 0n,
        entryPoint: {
            address: entryPoint06Address,
            version: '0.6',
        },
    })

    const simpleAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    expect(
        isAddress(simpleAccountClient.account.address) &&
            simpleAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const AMOUNT_TO_FUND = ALCHEMY ? '0.00001' : '1'
    const AMOUNT_FOR_USEROP = '0.0000001'

    const tx = await fundedWallet.sendTransaction({
        chain: getChain(),
        to: simpleAccountClient.account.address,
        value: parseEther(AMOUNT_TO_FUND),
    })

    await waitForTransactionReceipt(publicClient, {
        hash: tx,
    })

    expect(
        await publicClient.getBalance({
            address: simpleAccountClient.account.address,
        }),
    ).toBe(parseEther(AMOUNT_TO_FUND))

    //////////////////////////////////////////////////////////////
    // deploy simple account
    //////////////////////////////////////////////////////////////

    const txHash = await simpleAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt = await simpleAccountClient.waitForUserOperationReceipt({
        hash: txHash,
    })

    const entrypoint06 = await publicClient.readContract({
        address: simpleAccountClient.account.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })
    expect(entrypoint06).toEqual(entryPoint06Address)

    expect(useropReceipt.success).toBe(true)
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    expect(receipt?.status).toBe('success')

    const ownerResponse = await publicClient.readContract({
        address: simpleAccountClient.account.address,
        abi: ownerAbi,
        functionName: 'owner',
    })
    expect(ownerResponse).toBe(owner.address)

    //////////////////////////////////////////////////////////////
    // upgrade to modular account
    //////////////////////////////////////////////////////////////

    const modularAccountAddress = await determineSmartAccount({
        newAccountImplementationType: 'modular',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const modularAccount = await toModularSmartAccount({
        client: publicClient,
        address: modularAccountAddress.address,
        owner,
    })

    const upgradeToOpHash = await simpleAccountClient.sendUserOperation({
        calls: [
            {
                to: simpleAccountClient.account.address,
                data: (
                    await encodedUpgradeToAndCall({
                        chain: getChain(),
                        owner,
                    })
                ).callData,
            },
        ],
    })

    const upgradeToOpReceipt = await simpleAccountClient.waitForUserOperationReceipt({
        hash: upgradeToOpHash,
    })

    expect(upgradeToOpReceipt.success).toBe(true)

    expect(modularAccount.address).toEqual(simpleAccount.address)

    const [modularOwnerAddress] = await publicClient.readContract({
        address: modularAccount.address,
        abi: semiModularAccountBytecodeAbi,
        functionName: 'getFallbackSignerData',
    })

    expect(modularOwnerAddress).toBe(owner.address)

    const modularAccountAddress2 = await determineSmartAccount({
        newAccountImplementationType: 'modular',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(modularAccountAddress2.address).toEqual(modularAccount.address)

    const entrypoint07 = await publicClient.readContract({
        address: simpleAccount.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })

    expect(entrypoint07).toEqual(entryPoint07Address)

    const modularAccountClient = createSmartAccountClient({
        account: modularAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    const txHash2 = await modularAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt2 = await modularAccountClient.waitForUserOperationReceipt({
        hash: txHash2,
    })

    expect(useropReceipt2.success).toBe(true)
}, 10000000)

test('a simple account can be created and used', async () => {
    const publicClient = createPublicClient({
        chain: getChain(),
        transport: http(RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    const accountAddress = await determineSmartAccount({
        newAccountImplementationType: 'simple',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const simpleAccount = await toSimpleSmartAccount({
        client: publicClient,
        address: accountAddress.address,
        owner,
        nonceKey: 0n,
        entryPoint: {
            address: entryPoint06Address,
            version: '0.6',
        },
    })

    const simpleAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    expect(
        isAddress(simpleAccountClient.account.address) &&
            simpleAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const AMOUNT_TO_FUND = ALCHEMY ? '0.000001' : '1'
    const AMOUNT_FOR_USEROP = '0.0000001'

    const tx = await fundedWallet.sendTransaction({
        chain: getChain(),
        to: simpleAccountClient.account.address,
        value: parseEther(AMOUNT_TO_FUND),
    })

    await waitForTransactionReceipt(publicClient, {
        hash: tx,
    })

    expect(
        await publicClient.getBalance({
            address: simpleAccountClient.account.address,
        }),
    ).toBe(parseEther(AMOUNT_TO_FUND))

    //////////////////////////////////////////////////////////////
    // deploy simple account
    //////////////////////////////////////////////////////////////

    const txHash = await simpleAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt = await simpleAccountClient.waitForUserOperationReceipt({
        hash: txHash,
    })

    const entrypoint06 = await publicClient.readContract({
        address: simpleAccountClient.account.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })
    expect(entrypoint06).toEqual(entryPoint06Address)

    expect(useropReceipt.success).toBe(true)
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    expect(receipt?.status).toBe('success')

    const accountAddressAfterDeployment = await determineSmartAccount({
        newAccountImplementationType: 'simple',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(accountAddressAfterDeployment.address).toEqual(simpleAccountClient.account.address)
}, 10000000)

test('a modular account can be created and used', async () => {
    const publicClient = createPublicClient({
        chain: getChain(),
        transport: http(RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    const accountAddress = await determineSmartAccount({
        newAccountImplementationType: 'modular',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const modularAccount = await toModularSmartAccount({
        client: publicClient,
        address: accountAddress.address,
        owner,
    })

    const modularAccountClient = createSmartAccountClient({
        account: modularAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    expect(
        isAddress(modularAccountClient.account.address) &&
            modularAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const AMOUNT_TO_FUND = ALCHEMY ? '0.000001' : '1'
    const AMOUNT_FOR_USEROP = '0.0000001'

    const tx = await fundedWallet.sendTransaction({
        chain: getChain(),
        to: modularAccountClient.account.address,
        value: parseEther(AMOUNT_TO_FUND),
    })

    await waitForTransactionReceipt(publicClient, {
        hash: tx,
    })

    expect(
        await publicClient.getBalance({
            address: modularAccountClient.account.address,
        }),
    ).toBe(parseEther(AMOUNT_TO_FUND))

    //////////////////////////////////////////////////////////////
    // deploy light account
    //////////////////////////////////////////////////////////////

    const txHash = await modularAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt = await modularAccountClient.waitForUserOperationReceipt({
        hash: txHash,
    })

    const entrypoint07 = await publicClient.readContract({
        address: modularAccountClient.account.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })
    expect(entrypoint07).toEqual(entryPoint07Address)

    expect(useropReceipt.success).toBe(true)
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    const accountAddressAfterDeployment = await determineSmartAccount({
        newAccountImplementationType: 'modular',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(accountAddressAfterDeployment.address).toEqual(modularAccountClient.account.address)

    expect(receipt?.status).toBe('success')
}, 10000000)

test('a deployed simple account returns the correct address and account type when another client calls the endpoint', async () => {
    const publicClient = createPublicClient({
        chain: getChain(),
        transport: http(RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    //////////////////////////////////////////////////////////////
    // create simple account
    //////////////////////////////////////////////////////////////
    const simpleAccountData = await determineSmartAccount({
        newAccountImplementationType: 'simple',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const simpleAccount = await toSimpleSmartAccount({
        client: publicClient,
        address: simpleAccountData.address,
        owner,
        nonceKey: 0n,
        entryPoint: {
            address: entryPoint06Address,
            version: '0.6',
        },
    })

    const simpleAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    expect(
        isAddress(simpleAccountClient.account.address) &&
            simpleAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const AMOUNT_TO_FUND = ALCHEMY ? '0.00001' : '1'
    const AMOUNT_FOR_USEROP = '0.0000001'

    const tx = await fundedWallet.sendTransaction({
        chain: getChain(),
        to: simpleAccountClient.account.address,
        value: parseEther(AMOUNT_TO_FUND),
    })

    await waitForTransactionReceipt(publicClient, {
        hash: tx,
    })

    expect(
        await publicClient.getBalance({
            address: simpleAccountClient.account.address,
        }),
    ).toBe(parseEther(AMOUNT_TO_FUND))

    //////////////////////////////////////////////////////////////
    // deploy simple account
    //////////////////////////////////////////////////////////////

    const txHash = await simpleAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt = await simpleAccountClient.waitForUserOperationReceipt({
        hash: txHash,
    })

    const entrypoint06 = await publicClient.readContract({
        address: simpleAccountClient.account.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })
    expect(entrypoint06).toEqual(entryPoint06Address)

    expect(useropReceipt.success).toBe(true)
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    expect(receipt?.status).toBe('success')

    const ownerResponse = await publicClient.readContract({
        address: simpleAccountClient.account.address,
        abi: ownerAbi,
        functionName: 'owner',
    })
    expect(ownerResponse).toBe(owner.address)

    // now ios or staking site load this user
    const smartAccountDataWithoutNewImplementationType = await determineSmartAccount({
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(smartAccountDataWithoutNewImplementationType.accountType).toBe('simple')
    expect(smartAccountDataWithoutNewImplementationType.address).toMatch(simpleAccountData.address)

    const smartAccountDataWithWrongNewImplementationType = await determineSmartAccount({
        ownerAddress: owner.address,
        newAccountImplementationType: 'modular',
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(smartAccountDataWithWrongNewImplementationType.accountType).toBe('simple')
    expect(smartAccountDataWithoutNewImplementationType.address).toMatch(simpleAccountData.address)
}, 10000000)

test('a deployed modular account returns the correct address and account type when another client calls the endpoint', async () => {
    const publicClient = createPublicClient({
        chain: getChain(),
        transport: http(RPC_URL),
    })

    const owner = privateKeyToAccount(generatePrivateKey())

    //////////////////////////////////////////////////////////////
    // create modular account
    //////////////////////////////////////////////////////////////
    const modularAccountData = await determineSmartAccount({
        newAccountImplementationType: 'modular',
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    const modularAccount = await toModularSmartAccount({
        client: publicClient,
        address: modularAccountData.address,
        owner,
    })

    const modularAccountClient = createSmartAccountClient({
        account: modularAccount,
        chain: getChain(),
        bundlerTransport: http(BUNDLER_RPC_URL),
        userOperation: {
            estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
        },
    })

    expect(
        isAddress(modularAccountClient.account.address) &&
            modularAccountClient.account.address !== zeroAddress,
    ).toBe(true)

    const AMOUNT_TO_FUND = ALCHEMY ? '0.00001' : '1'
    const AMOUNT_FOR_USEROP = '0.0000001'

    const tx = await fundedWallet.sendTransaction({
        chain: getChain(),
        to: modularAccountClient.account.address,
        value: parseEther(AMOUNT_TO_FUND),
    })

    await waitForTransactionReceipt(publicClient, {
        hash: tx,
    })

    expect(
        await publicClient.getBalance({
            address: modularAccountClient.account.address,
        }),
    ).toBe(parseEther(AMOUNT_TO_FUND))

    //////////////////////////////////////////////////////////////
    // deploy modular account
    //////////////////////////////////////////////////////////////

    const txHash = await modularAccountClient.sendUserOperation({
        calls: [
            {
                to: zeroAddress,
                value: parseEther(AMOUNT_FOR_USEROP),
            },
        ],
    })

    const useropReceipt = await modularAccountClient.waitForUserOperationReceipt({
        hash: txHash,
    })

    const entrypoint07 = await publicClient.readContract({
        address: modularAccountClient.account.address,
        abi: entrypointAbi,
        functionName: 'entryPoint',
    })
    expect(entrypoint07).toEqual(entryPoint07Address)

    expect(useropReceipt.success).toBe(true)
    const receipt = await publicClient.getTransactionReceipt({
        hash: useropReceipt.receipt.transactionHash,
    })

    expect(receipt?.status).toBe('success')

    const [modularOwnerAddress] = await publicClient.readContract({
        address: modularAccountClient.account.address,
        abi: [
            {
                type: 'function',
                name: 'getFallbackSignerData',
                inputs: [],
                outputs: [
                    {
                        name: '',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: '',
                        type: 'bool',
                        internalType: 'bool',
                    },
                ],
                stateMutability: 'view',
            },
        ],
        functionName: 'getFallbackSignerData',
    })
    expect(modularOwnerAddress).toBe(owner.address)

    // now ios or staking site load this user
    const smartAccountDataWithoutNewImplementationType = await determineSmartAccount({
        ownerAddress: owner.address,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(smartAccountDataWithoutNewImplementationType.accountType).toBe('modular')
    expect(smartAccountDataWithoutNewImplementationType.address).toMatch(modularAccountData.address)

    const smartAccountDataWithWrongNewImplementationType = await determineSmartAccount({
        ownerAddress: owner.address,
        newAccountImplementationType: 'simple',
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(smartAccountDataWithWrongNewImplementationType.accountType).toBe('modular')
    expect(smartAccountDataWithWrongNewImplementationType.address).toMatch(
        modularAccountData.address,
    )
}, 10000000)

const entrypointAbi = [
    {
        inputs: [],
        name: 'entryPoint',
        outputs: [{ internalType: 'contract IEntryPoint', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

async function encodedUpgradeToAndCall(args: { chain: Chain; owner: LocalAccount }) {
    const { chain, owner } = args

    const intializeData = encodeFunctionData({
        abi: semiModularAccountStorageAbi,
        functionName: 'initialize',
        args: [owner.address],
    })

    const implAddress = chain && getDefaultSMAV2StorageAddress(chain)

    const callData = encodeFunctionData({
        abi: upgradeAbi,
        functionName: 'upgradeToAndCall',
        args: [implAddress, intializeData],
    })

    console.log('[upgradeTo] implAddress', implAddress)
    console.log('[upgradeTo] initData', intializeData)
    console.log('[upgradeTo] callData', callData)

    return {
        callData,
        implAddress,
        intializeData,
    }
}
