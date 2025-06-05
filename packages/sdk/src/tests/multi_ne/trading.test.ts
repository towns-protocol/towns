import { Client } from '../../client'
import { makeUniqueChannelStreamId } from '../../id'
import {
    extractMemberBlockchainTransactions,
    getXchainConfigForTesting,
    makeDonePromise,
    makeTestClient,
    makeUniqueSpaceStreamId,
    makeUserContextFromWallet,
    waitFor,
} from '../testUtils'
import { ContractReceipt } from '../../types'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { ethers } from 'ethers'

import { TestERC20 } from '@towns-protocol/web3'
import { BlockchainTransaction_TokenTransfer, PlainMessage } from '@towns-protocol/proto'

describe('Trading', () => {
    const tokenName = 'Erc20 token test'
    let bobClient: Client
    const bobWallet = ethers.Wallet.createRandom()

    let aliceClient: Client
    const aliceWallet = ethers.Wallet.createRandom()

    let charlieClient: Client

    let spaceId!: string
    let channelId!: string
    let threadParentId!: string
    let tokenAddress: string
    let buyReceipt: ContractReceipt
    let sellReceipt: ContractReceipt
    const amountToTransfer = 10n
    const eventEmittedPromise = makeDonePromise()
    const provider = new ethers.providers.StaticJsonRpcProvider(
        getXchainConfigForTesting().supportedRpcUrls[31337],
    )

    beforeAll(async () => {
        // boilerplate — create clients, join streams, etc.
        const bobContext = await makeUserContextFromWallet(bobWallet)
        bobClient = await makeTestClient({ context: bobContext })
        await bobClient.initializeUser()
        bobClient.startSync()

        const aliceContext = await makeUserContextFromWallet(aliceWallet)
        aliceClient = await makeTestClient({ context: aliceContext })
        await aliceClient.initializeUser()
        aliceClient.startSync()

        spaceId = makeUniqueSpaceStreamId()
        await bobClient.createSpace(spaceId)
        channelId = makeUniqueChannelStreamId(spaceId)
        await bobClient.createChannel(spaceId, 'Channel', 'Topic', channelId)
        await aliceClient.joinStream(spaceId)
        await aliceClient.joinStream(channelId)

        charlieClient = await makeTestClient()
        await charlieClient.initializeUser()
        charlieClient.startSync()
        await charlieClient.joinStream(spaceId)
        await charlieClient.joinStream(channelId)

        const result = await bobClient.sendMessage(channelId, 'try out this token: $yo!')
        threadParentId = result.eventId

        /* Time to perform an on-chain transaction! We utilize the fact that transfers emit 
        a Transfer event, Transfer(address,address,amount) to be precise. Regardless of how 
        the tx was made (dex, transfer etc), an event will be available in the tx logs!
        here we go, Bob transfers an amount of tokens to Alice.
        */
        tokenAddress = await TestERC20.getContractAddress(tokenName)
        await TestERC20.publicMint(tokenName, bobClient.userId as `0x${string}`, 100)
        const { transactionHash: sellTransactionHash } = await TestERC20.transfer(
            tokenName,
            aliceClient.userId as `0x${string}`,
            bobWallet.privateKey as `0x${string}`,
            amountToTransfer,
        )

        const sellTransaction = await provider.getTransaction(sellTransactionHash)
        const sellTransactionReceipt = await provider.getTransactionReceipt(sellTransactionHash)

        sellReceipt = {
            from: sellTransaction.from,
            to: sellTransaction.to!,
            transactionHash: sellTransaction.hash,
            blockNumber: sellTransaction.blockNumber!,
            logs: sellTransactionReceipt.logs,
        }

        const { transactionHash: buyTransactionHash } = await TestERC20.transfer(
            tokenName,
            aliceClient.userId as `0x${string}`,
            bobWallet.privateKey as `0x${string}`,
            amountToTransfer,
        )

        const buyTransaction = await provider.getTransaction(buyTransactionHash)
        const buyTransactionReceipt = await provider.getTransactionReceipt(buyTransactionHash)

        buyReceipt = {
            from: buyTransaction.from,
            to: buyTransaction.to!,
            transactionHash: buyTransaction.hash,
            blockNumber: buyTransaction.blockNumber!,
            logs: buyTransactionReceipt.logs,
        }

        bobClient.once('streamTokenTransfer', (streamId, data) => {
            expect(streamId).toBe(channelId)
            expect(data.userId).toBe(bobClient.userId)
            expect(data.createdAtEpochMs > 0n).toBe(true)
            expect(data.chainId).toBe('31337')
            expect(data.amount).toBe(10n)
            expect(data.messageId).toBe(threadParentId)
            expect(data.isBuy).toBe(false)
            eventEmittedPromise.done()
        })
    })

    afterAll(async () => {
        await bobClient.stop()
        await aliceClient.stop()
        await charlieClient.stop()
    })

    test('should reject token transfers where the amount doesnt match the transferred amount', async () => {
        // this is a transfer event with an amount that doesn't match the amount transferred
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 9n.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(bobClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            bobClient.addTransaction_Transfer(31337, sellReceipt, transferEvent),
        ).rejects.toThrow('matching transfer event not found in receipt logs')
    })

    test('should reject token transfers where the user is neither the sender nor the recipient', async () => {
        // this is a transfer event from charlie, he's barely a member of the channel
        // and he's not the sender nor the recipient
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(charlieClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        await expect(
            charlieClient.addTransaction_Transfer(31337, buyReceipt, transferEvent),
        ).rejects.toThrow('matching transfer event not found in receipt logs')
    })

    test('should reject token transfers where the user claims to be the buyer but is the seller', async () => {
        // this is a transfer event from charlie, he's barely a member of the channel
        // and he's not the sender nor the recipient
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(bobClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        await expect(
            bobClient.addTransaction_Transfer(31337, buyReceipt, transferEvent),
        ).rejects.toThrow('matching transfer event not found in receipt logs')
    })

    test('should reject token transfers where the user claims to be the seller but is the seller', async () => {
        // this is a transfer event from charlie, he's barely a member of the channel
        // and he's not the sender nor the recipient
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(aliceClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            aliceClient.addTransaction_Transfer(31337, sellReceipt, transferEvent),
        ).rejects.toThrow('matching transfer event not found in receipt logs')
    })

    test('should reject token transfers where the token address doesnt match', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress).toReversed(), // mess up the token address
            sender: bin_fromHexString(bobClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }
        await expect(
            aliceClient.addTransaction_Transfer(31337, sellReceipt, transferEvent),
        ).rejects.toThrow('matching transfer event not found in receipt logs')
    })

    test('should accept token transfers where the user == from and isBuy == false', async () => {
        // this is a transfer event from bob, he's the sender (from)
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(bobClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        const { eventId } = await bobClient.addTransaction_Transfer(
            31337,
            sellReceipt,
            transferEvent,
        )
        expect(eventId).toBeDefined()

        await waitFor(() =>
            expect(extractMemberBlockchainTransactions(bobClient, channelId).length).toBe(1),
        )
    })

    test('should accept token transfers where the user == to and isBuy == true', async () => {
        // this is a transfer event to alice, she's the recipient (to)
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(aliceClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        const { eventId } = await aliceClient.addTransaction_Transfer(
            31337,
            buyReceipt,
            transferEvent,
        )
        expect(eventId).toBeDefined()

        await waitFor(() =>
            expect(extractMemberBlockchainTransactions(aliceClient, channelId).length).toBe(2),
        )
    })

    test('tokentransfer events are emitted', async () => {
        await eventEmittedPromise.expectToSucceed()
    })

    test('the token transfer is represented in the membership content', async () => {
        const stream = bobClient.streams.get(channelId)
        expect(stream).toBeDefined()
        const transfer = stream!.view.membershipContent.tokenTransfers[0]
        expect(transfer.userId).toBe(bobClient.userId)
        expect(transfer.createdAtEpochMs > 0n).toBe(true)
        expect(transfer.chainId).toBe('31337')
        expect(transfer.amount).toBe(10n)
        expect(transfer.messageId).toBe(threadParentId)
        expect(transfer.isBuy).toBe(false)
    })

    test('should reject duplicate transfers', async () => {
        // alice can't add the same transfer event twice
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: amountToTransfer.toString(),
            address: bin_fromHexString(tokenAddress),
            sender: bin_fromHexString(aliceClient.userId),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        await expect(
            aliceClient.addTransaction_Transfer(31337, buyReceipt, transferEvent),
        ).rejects.toThrow('duplicate transaction')
    })

    test('alice sees transfer event in her user stream', async () => {
        await waitFor(() => {
            const streamId = aliceClient.userStreamId!
            const stream = aliceClient.streams.get(streamId)
            if (!stream) throw new Error('no stream found')

            const transferEvents = stream.view.userContent.tokenTransfers
            expect(transferEvents.length).toBe(1)
            const event0 = transferEvents[0]
            expect(BigInt(event0.amount)).toBe(amountToTransfer)
        })
    })

    test('bob sees transfer event in his user stream', async () => {
        await waitFor(() => {
            const streamId = bobClient.userStreamId!
            const stream = bobClient.streams.get(streamId)
            if (!stream) throw new Error('no stream found')

            const transferEvents = stream.view.userContent.tokenTransfers
            expect(transferEvents.length).toBe(1)
            const event0 = transferEvents[0]
            expect(BigInt(event0.amount)).toBe(amountToTransfer)
            expect(new Uint8Array(event0.sender)).toEqual(bin_fromHexString(bobClient.userId))
        })
    })

    test('bob sees both transfer events in the channel stream', async () => {
        await waitFor(() => {
            const transferEvents = extractMemberBlockchainTransactions(aliceClient, channelId)
            expect(transferEvents.length).toBe(2)
            const [event0, event1] = [transferEvents[0], transferEvents[1]]
            expect(BigInt(event0.amount)).toBe(amountToTransfer)
            expect(event0.userId).toEqual(bobClient.userId)
            expect(event0.isBuy).toBe(false)
            expect(BigInt(event1.amount)).toBe(amountToTransfer)
            expect(event1.userId).toEqual(aliceClient.userId)
            expect(event1.isBuy).toBe(true)
        })
    })
})
