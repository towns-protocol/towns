import { describe, it, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { determineSmartAccount, ERC4337 } from '../src/determineSmartAccount'
import {
    Chain,
    createPublicClient,
    encodeFunctionData,
    http,
    isAddress,
    LocalAccount,
    parseEther,
    zeroAddress,
} from 'viem'
import { createTestClient } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { entryPoint06Address, entryPoint07Address } from 'viem/account-abstraction'
import { createSmartAccountClient } from 'permissionless/clients'
import { foundry } from 'viem/chains'
import { Env, worker } from '../src/index'

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

const OWNER = '0x8E92749c43f9884EA0402AE83CBCf7280068C476'
const MODULAR_ADDRESS = '0x75D55630E5804E9E2Ac45d98Caa4BC12CD30A33F'
const SIMPLE_ADDRESS = '0xC8FfDA60a6a0fAbe57bb49be2c6e4E02b226eA67'
const RPC_URL = 'http://localhost:8545'

describe('determineSmartAccount', () => {
    it('should determine a simple account address', async () => {
        const AUTH_TOKEN = 'Zm9v'
        const request = new IncomingRequest(
            `http://fake-server.com/api/smart-account/${OWNER}?newAccountImplementationType=simple`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            },
        )
        const ctx = createExecutionContext()

        const response = await worker.fetch(request, env as Env)
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx)
        const json = (await response.json()) as { data: { address: string; accountType: string } }
        const data = json.data
        expect(data.address).toBe(SIMPLE_ADDRESS)
        expect(data.accountType).toBe('simple')
    })

    it('should determine a simple account address if no newAccountImplementationType is passed', async () => {
        const AUTH_TOKEN = 'Zm9v'
        const request = new IncomingRequest(`http://fake-server.com/api/smart-account/${OWNER}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            },
        })
        const ctx = createExecutionContext()

        const response = await worker.fetch(request, env as Env)
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx)
        const json = (await response.json()) as { data: { address: string; accountType: string } }
        const data = json.data
        expect(data.address).toBe(SIMPLE_ADDRESS)
        expect(data.accountType).toBe('simple')
    })

    it('should determine a modular account address', async () => {
        const AUTH_TOKEN = 'Zm9v'
        const request = new IncomingRequest(
            `http://fake-server.com/api/smart-account/${OWNER}?newAccountImplementationType=modular`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            },
        )
        const ctx = createExecutionContext()

        const response = await worker.fetch(request, env as Env)
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx)
        const json = (await response.json()) as { data: { address: string; accountType: string } }
        const data = json.data
        expect(data.address).toBe(MODULAR_ADDRESS)
        expect(data.accountType).toBe('modular')
    })

    // This test emulates a client that would call this endpoint
    it('should handle different implementations correctly', async () => {
        const publicClient = createPublicClient({
            chain: foundry,
            transport: http(RPC_URL),
        })

        const anvilClient = createTestClient({
            transport: http(RPC_URL),
            mode: 'anvil',
        })

        const owner = privateKeyToAccount(generatePrivateKey())

        const simpleAccountData = await determineSmartAccount({
            newAccountImplementationType: 'simple',
            ownerAddress: owner.address,
            environment: 'development',
            env: env as Env,
        })
        expect(simpleAccountData.accountType).toBe('simple')
        const simpleAddress = simpleAccountData.address

        await anvilClient.setBalance({
            address: simpleAddress,
            value: parseEther('1'),
        })

        const simpleAccount = await toSimpleSmartAccount({
            client: publicClient,
            address: simpleAddress,
            owner,
            nonceKey: 0n,
            entryPoint: {
                address: entryPoint06Address,
                version: '0.6',
            },
        })

        const AMOUNT_FOR_USEROP = '0.0000001'

        const simpleAccountClient = createSmartAccountClient({
            account: simpleAccount,
            chain: foundry,
            bundlerTransport: http('http://localhost:43370'),
            userOperation: {
                estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
            },
        })

        expect(
            isAddress(simpleAccountClient.account.address) &&
                simpleAccountClient.account.address !== zeroAddress,
        ).toBe(true)

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

        expect(useropReceipt.success).toBe(true)
        const receipt = await publicClient.getTransactionReceipt({
            hash: useropReceipt.receipt.transactionHash,
        })

        expect(receipt?.status).toBe('success')

        const entrypoint06 = await publicClient.readContract({
            address: simpleAccountClient.account.address,
            abi: [
                {
                    inputs: [],
                    name: 'entryPoint',
                    outputs: [{ internalType: 'contract IEntryPoint', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'entryPoint',
        })
        expect(entrypoint06).toEqual(entryPoint06Address)

        const ownerResponse = await publicClient.readContract({
            address: simpleAddress,
            abi: [
                {
                    inputs: [],
                    name: 'owner',
                    outputs: [{ internalType: 'address', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'owner',
        })
        expect(ownerResponse).toBe(owner.address)

        // new client after newAccountImplementationType: 'modular'
        const preUpgradeData = await determineSmartAccount({
            newAccountImplementationType: 'modular',
            ownerAddress: owner.address,
            environment: 'development',
            env: env as Env,
        })

        expect(preUpgradeData.accountType).toBe('simple')
        expect(preUpgradeData.address).toMatch(simpleAddress)

        const upgradeToOpHash = await simpleAccountClient.sendUserOperation({
            calls: [
                {
                    to: simpleAccountClient.account.address,
                    data: (
                        await encodedUpgradeToAndCall({
                            chain: foundry,
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

        expect(preUpgradeData.address).toEqual(simpleAccount.address)

        const [modularOwnerAddress] = await publicClient.readContract({
            address: preUpgradeData.address,
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

        const postUpgradeData = await determineSmartAccount({
            newAccountImplementationType: 'modular',
            ownerAddress: owner.address,
            environment: 'development',
            env: env as Env,
        })

        expect(postUpgradeData.address).toEqual(preUpgradeData.address)

        const entrypoint07 = await publicClient.readContract({
            address: simpleAccount.address,
            abi: [
                {
                    inputs: [],
                    name: 'entryPoint',
                    outputs: [{ internalType: 'contract IEntryPoint', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'entryPoint',
        })

        expect(entrypoint07).toEqual(entryPoint07Address)
    })

    it('should return previously created simple account if no newAccountImplementationType is passed', async () => {
        const request = new IncomingRequest(
            `http://fake-server.com/api/smart-account/${OWNER}?newAccountImplementationType=simple`,
        )

        const publicClient = createPublicClient({
            chain: foundry,
            transport: http(RPC_URL),
        })

        const anvilClient = createTestClient({
            transport: http(RPC_URL),
            mode: 'anvil',
        })

        const owner = privateKeyToAccount(generatePrivateKey())

        // web app creates a new simple account
        const simpleAccountData = await determineSmartAccount({
            newAccountImplementationType: 'simple',
            ownerAddress: owner.address,
            environment: 'development',
            env: env as Env,
        })

        expect(simpleAccountData.accountType).toBe('simple')
        const simpleAddress = simpleAccountData.address

        await anvilClient.setBalance({
            address: simpleAddress,
            value: parseEther('1'),
        })

        const simpleAccount = await toSimpleSmartAccount({
            client: publicClient,
            address: simpleAddress,
            owner,
            nonceKey: 0n,
            entryPoint: {
                address: entryPoint06Address,
                version: '0.6',
            },
        })

        const AMOUNT_FOR_USEROP = '0.0000001'

        const simpleAccountClient = createSmartAccountClient({
            account: simpleAccount,
            chain: foundry,
            bundlerTransport: http('http://localhost:43370'),
            userOperation: {
                estimateFeesPerGas: async () => await publicClient.estimateFeesPerGas(),
            },
        })

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

        expect(useropReceipt.success).toBe(true)
        const receipt = await publicClient.getTransactionReceipt({
            hash: useropReceipt.receipt.transactionHash,
        })

        expect(receipt?.status).toBe('success')

        const entrypoint06 = await publicClient.readContract({
            address: simpleAccountClient.account.address,
            abi: [
                {
                    inputs: [],
                    name: 'entryPoint',
                    outputs: [{ internalType: 'contract IEntryPoint', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'entryPoint',
        })
        expect(entrypoint06).toEqual(entryPoint06Address)

        const ownerResponse = await publicClient.readContract({
            address: simpleAddress,
            abi: [
                {
                    inputs: [],
                    name: 'owner',
                    outputs: [{ internalType: 'address', name: '', type: 'address' }],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'owner',
        })
        expect(ownerResponse).toBe(owner.address)

        // now ios or staking site load this user
        const preUpgradeData = await determineSmartAccount({
            ownerAddress: owner.address,
            environment: 'development',
            env: env as Env,
        })

        expect(preUpgradeData.accountType).toBe('simple')
        expect(preUpgradeData.address).toMatch(simpleAddress)
    })
}, 1000000)

async function encodedUpgradeToAndCall(args: { chain: Chain; owner: LocalAccount }) {
    const { chain, owner } = args

    const intializeData = encodeFunctionData({
        abi: [
            {
                type: 'function',
                name: 'initialize',
                inputs: [
                    {
                        name: 'initialSigner',
                        type: 'address',
                        internalType: 'address',
                    },
                ],
                outputs: [],
                stateMutability: 'nonpayable',
            },
        ],
        functionName: 'initialize',
        args: [owner.address],
    })

    const implAddress = '0x0000000000006E2f9d80CaEc0Da6500f005EB25A'

    const callData = encodeFunctionData({
        abi: [
            {
                inputs: [{ internalType: 'address', name: 'newImplementation', type: 'address' }],
                name: 'upgradeTo',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            {
                inputs: [
                    { internalType: 'address', name: 'newImplementation', type: 'address' },
                    { internalType: 'bytes', name: 'data', type: 'bytes' },
                ],
                name: 'upgradeToAndCall',
                outputs: [],
                stateMutability: 'payable',
                type: 'function',
            },
        ],
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
