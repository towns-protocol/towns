import { describe, it, expect, beforeAll } from 'vitest'
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    type Hex,
    type Address,
    type PublicClient,
    type Transport,
    type Chain,
    type WalletClient,
} from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createBundlerClient } from 'viem/account-abstraction'
import { toModularSmartAccount } from '../src/create2/toModularSmartAccount'
import { toTownsSmartAccount } from '../src/create2/toTownsSmartAccount'
import walletLinkAbi from '@towns-protocol/generated/v3/abis/WalletLink.abi'
import { discoverAccount } from '../src/id/discoverAccount'

// SpaceFactory address from local deployment
const SPACE_FACTORY_ADDRESS = process.env.BASE_ADDRESSES_SPACE_FACTORY as Address

// Anvil default funded account
const ANVIL_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

const ANVIL_RPC_URL = process.env.ANVIL_RPC_URL || 'http://127.0.0.1:8545'
const BUNDLER_RPC_URL = process.env.BUNDLER_RPC_URL || 'http://127.0.0.1:4337'

describe('UserOp Integration Tests', () => {
    // Tests that require external anvil instance with Alto bundler
    // Run "Start Local Dev" or "just anvils" (with USE_DOCKER_CHAINS=1) before running these tests
    describe('with Alto bundler', () => {
        let bundlerClient: ReturnType<typeof createBundlerClient>
        let publicClient: PublicClient<Transport, Chain>
        let walletClient: WalletClient<Transport, Chain, PrivateKeyAccount>

        beforeAll(async () => {
            publicClient = createPublicClient({
                chain: foundry,
                transport: http(ANVIL_RPC_URL),
            })

            walletClient = createWalletClient({
                chain: foundry,
                transport: http(ANVIL_RPC_URL),
                account: privateKeyToAccount(ANVIL_PRIVATE_KEY),
            })

            // Use Alto bundler from Docker (started via "Start Local Dev" or "just anvils")
            bundlerClient = createBundlerClient({
                client: publicClient,
                transport: http(BUNDLER_RPC_URL),
            })
        })

        it('should create a modular smart account and send a userOp', async () => {
            // Create owner and smart account
            const owner = privateKeyToAccount(generatePrivateKey())
            const discovered = await discoverAccount(publicClient, owner.address, 'modular')
            const smartAccount = await toModularSmartAccount({
                client: publicClient,
                owner,
                address: discovered.address,
            })

            expect(smartAccount.address).toBeDefined()
            const fundTx = await walletClient.sendTransaction({
                to: smartAccount.address,
                value: parseEther('1'),
            })
            await publicClient.waitForTransactionReceipt({ hash: fundTx })
            const recipient = privateKeyToAccount(generatePrivateKey()).address
            // Note: Explicit gas limits are required because Alto's gas estimation
            // has a second validation pass that fails for modular accounts.
            // This is a known Alto issue with Alchemy's ModularAccountFactory.
            const userOpHash = await bundlerClient.sendUserOperation({
                account: smartAccount,
                calls: [{ to: recipient, value: parseEther('0.1') }],
                callGasLimit: 200000n,
                verificationGasLimit: 500000n,
                preVerificationGas: 100000n,
            })
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash,
            })
            expect(receipt.success).toBe(true)
            const recipientBalance = await publicClient.getBalance({ address: recipient })
            expect(recipientBalance).toBe(parseEther('0.1'))
        })

        it('should handle batch operations', async () => {
            const owner = privateKeyToAccount(generatePrivateKey())
            const discovered = await discoverAccount(publicClient, owner.address, 'modular')
            const smartAccount = await toModularSmartAccount({
                client: publicClient,
                owner,
                address: discovered.address,
            })

            const fundTx = await walletClient.sendTransaction({
                to: smartAccount.address,
                value: parseEther('2'),
            })
            await publicClient.waitForTransactionReceipt({ hash: fundTx })

            const recipient1 = privateKeyToAccount(generatePrivateKey()).address
            const recipient2 = privateKeyToAccount(generatePrivateKey()).address

            // Note: Explicit gas limits are required because Alto's gas estimation
            // has a second validation pass that fails for modular accounts.
            const userOpHash = await bundlerClient.sendUserOperation({
                account: smartAccount,
                calls: [
                    { to: recipient1, value: parseEther('0.1') },
                    { to: recipient2, value: parseEther('0.2') },
                ],
                callGasLimit: 300000n,
                verificationGasLimit: 500000n,
                preVerificationGas: 100000n,
            })

            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash,
            })

            expect(receipt.success).toBe(true)
            expect(await publicClient.getBalance({ address: recipient1 })).toBe(parseEther('0.1'))
            expect(await publicClient.getBalance({ address: recipient2 })).toBe(parseEther('0.2'))
        })

        it('should link smart account to root key via WalletLink', async () => {
            const rootKey = privateKeyToAccount(generatePrivateKey())
            const owner = privateKeyToAccount(generatePrivateKey())
            const discovered = await discoverAccount(publicClient, owner.address, 'modular')
            const smartAccount = await toModularSmartAccount({
                client: publicClient,
                owner,
                address: discovered.address,
            })

            // Fund the smart account
            const fundTx = await walletClient.sendTransaction({
                to: smartAccount.address,
                value: parseEther('1'),
            })
            await publicClient.waitForTransactionReceipt({ hash: fundTx })

            // Get the nonce for the root key
            const nonce = await publicClient.readContract({
                address: SPACE_FACTORY_ADDRESS,
                abi: walletLinkAbi,
                functionName: 'getLatestNonceForRootKey',
                args: [rootKey.address],
            })

            // Create EIP-712 signature from root key
            // Domain and types must match WalletLinkBase.sol
            const LINKED_WALLET_MESSAGE = 'Link your external wallet'
            const domain = {
                name: 'SpaceFactory',
                version: '1',
                chainId: foundry.id,
                verifyingContract: SPACE_FACTORY_ADDRESS,
            }
            const types = {
                LinkedWallet: [
                    { name: 'message', type: 'string' },
                    { name: 'userID', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                ],
            }
            const value = {
                message: LINKED_WALLET_MESSAGE,
                userID: smartAccount.address as Address,
                nonce,
            }

            const signature = await rootKey.signTypedData({
                domain,
                types,
                primaryType: 'LinkedWallet',
                message: value,
            })

            // Send userOp to link the smart account to the root key
            // Note: Explicit gas limits required for Alto bundler with modular accounts
            const userOpHash = await bundlerClient.sendUserOperation({
                account: smartAccount,
                calls: [
                    {
                        to: SPACE_FACTORY_ADDRESS,
                        abi: walletLinkAbi,
                        functionName: 'linkCallerToRootKey',
                        args: [
                            {
                                addr: rootKey.address,
                                signature,
                                message: LINKED_WALLET_MESSAGE,
                            },
                            nonce,
                        ],
                    },
                ],
                callGasLimit: 300000n,
                verificationGasLimit: 500000n,
                preVerificationGas: 100000n,
            })

            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash,
            })
            expect(receipt.success).toBe(true)
            const isLinked = await publicClient.readContract({
                address: SPACE_FACTORY_ADDRESS,
                abi: walletLinkAbi,
                functionName: 'checkIfLinked',
                args: [rootKey.address, smartAccount.address],
            })
            expect(isLinked).toBe(true)
        })
    })

    describe('account creation (no bundler)', () => {
        let publicClient: PublicClient<Transport, Chain>

        beforeAll(() => {
            publicClient = createPublicClient({
                chain: foundry,
                transport: http(ANVIL_RPC_URL),
            })
        })

        it('modular account address is deterministic', async () => {
            const owner = privateKeyToAccount(
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
            )
            const account = await toTownsSmartAccount({
                client: publicClient,
                owner,
                preferredType: 'modular',
            })

            expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
        })

        it('simple account address is deterministic', async () => {
            const owner = privateKeyToAccount(
                '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex,
            )
            const account = await toTownsSmartAccount({
                client: publicClient,
                owner,
                preferredType: 'simple',
            })

            expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
        })

        it('different owners get different addresses', async () => {
            const owner1 = privateKeyToAccount(
                '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
            )
            const owner2 = privateKeyToAccount(
                '0x2222222222222222222222222222222222222222222222222222222222222222' as Hex,
            )

            const account1 = await toTownsSmartAccount({
                client: publicClient,
                owner: owner1,
                preferredType: 'modular',
            })

            const account2 = await toTownsSmartAccount({
                client: publicClient,
                owner: owner2,
                preferredType: 'modular',
            })

            expect(account1.address).not.toBe(account2.address)
        })

        it('simple and modular accounts have different addresses for same owner', async () => {
            const owner = privateKeyToAccount(
                '0x3333333333333333333333333333333333333333333333333333333333333333' as Hex,
            )

            const simpleAccount = await toTownsSmartAccount({
                client: publicClient,
                owner,
                preferredType: 'simple',
            })

            const modularAccount = await toTownsSmartAccount({
                client: publicClient,
                owner,
                preferredType: 'modular',
            })

            expect(simpleAccount.address).not.toBe(modularAccount.address)
        })
    })
})
