import { Client } from '../../client'
import {
    extractMemberBlockchainTransactions,
    makeDonePromise,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
} from '../testUtils'
import { makeUniqueChannelStreamId } from '../../id'
import { BlockchainTransaction_TokenTransfer, PlainMessage } from '@towns-protocol/proto'
import { SolanaTransactionReceipt } from '../../types'
import { bin_fromHexString, bin_fromString, bin_toString } from '@towns-protocol/utils'

describe('Trading Solana', () => {
    let bobClient: Client
    const mintAddress = '2HQXvda5sUjGLRKLG6LEqSctARYJboufSfG2Qciqmoon'
    const bobSolanaWalletAddress = '3cfwgyZY7uLNEv72etBQArWSoTzmXEm7aUmW3xE5xG4P'
    let spaceId!: string
    let channelId!: string
    let threadParentId!: string
    const eventEmittedPromise = makeDonePromise()

    const validSellReceipt: SolanaTransactionReceipt = {
        transaction: {
            signatures: [
                '4uPV4YciNkRoRqaN5bsDw4HzPTCuavM94sbdaZPkaVVEXkyaNNT4KLpuvwBsyJUkzzzjLXpVx88dRswJ6tRp41VG',
            ],
        },
        meta: {
            preTokenBalances: [
                {
                    amount: { amount: '4804294168682', decimals: 9 },
                    mint: mintAddress,
                    owner: bobSolanaWalletAddress,
                },
            ],
            postTokenBalances: [
                {
                    amount: { amount: '0', decimals: 9 },
                    mint: mintAddress,
                    owner: bobSolanaWalletAddress,
                },
            ],
        },
        slot: 320403856n,
    }

    const validBuyReceipt: SolanaTransactionReceipt = {
        transaction: {
            signatures: [
                '3jFRj6BYWEcwHxPkF7N2x7xNggvuNkfEPwcwnQRPzY5urC9oQ1Fh9rR8MG76Vosf7xWg4CWB4RSpBhkuHvHX9qDj',
            ],
        },
        meta: {
            preTokenBalances: [
                {
                    amount: { amount: '0', decimals: 9 },
                    mint: mintAddress,
                    owner: bobSolanaWalletAddress,
                },
            ],
            postTokenBalances: [
                {
                    amount: { amount: '4804294168682', decimals: 9 },
                    mint: mintAddress,
                    owner: bobSolanaWalletAddress,
                },
            ],
        },
        slot: 320403856n,
    }

    const validBuyReceiptWithoutPreTokenBalance: SolanaTransactionReceipt = {
        transaction: {
            signatures: [
                '1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678',
            ],
        },
        meta: {
            preTokenBalances: [],
            postTokenBalances: [
                {
                    amount: { amount: '1234567890', decimals: 9 },
                    mint: mintAddress,
                    owner: bobSolanaWalletAddress,
                },
            ],
        },
        slot: 320403856n,
    }

    beforeAll(async () => {
        bobClient = await makeTestClient()
        await bobClient.initializeUser()
        bobClient.startSync()

        spaceId = makeUniqueSpaceStreamId()
        await bobClient.createSpace(spaceId)
        channelId = makeUniqueChannelStreamId(spaceId)
        await bobClient.createChannel(spaceId, 'Channel', 'Topic', channelId)

        const result = await bobClient.sendMessage(channelId, 'try out this token: $yo!')
        threadParentId = result.eventId

        bobClient.once('streamTokenTransfer', (streamId, data) => {
            expect(streamId).toBe(channelId)
            expect(data.createdAtEpochMs > 0n).toBe(true)
            expect(data.chainId).toBe('solana-mainnet')
            expect(data.amount).toBe(4804294168682n)
            expect(data.messageId).toBe(threadParentId)
            expect(data.isBuy).toBe(false)
            eventEmittedPromise.done()
        })
    })

    test('Solana transactions are rejected if the amount is invalid', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 5804294168682n.toString(), // invalid amount
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).rejects.toThrow('transaction amount not equal to balance diff')
    })

    test('Token amounts for buy transactions need to be increasing', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true, // wrong: this is not a buy, this is a sell
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).rejects.toThrow('transfer transaction is buy but balance decreased')
    })

    test('Token amounts for sell transactions needs to be decreasing', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false, // wrong: this is not a sell, this is a buy
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validBuyReceipt, transferEvent),
        ).rejects.toThrow('transfer transaction is sell but balance increased')
    })

    test('Solana transactions are rejected if the mint doesnt match the address', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress).toReversed(), // invalid address
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).rejects.toThrow('transaction mint not found')
    })

    test('Solana transactions are rejected if the sender is invalid', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress).toReversed(), // invalid sender
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }
        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).rejects.toThrow('solana transfer transaction mint not found')
    })

    test('Solana transactions are accepted if the amount, mint and owner are valid (sell)', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).resolves.not.toThrow()
    })

    test('Duplicate solana transactions are not accepted', async () => {
        // this tx is the same as the one above
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent),
        ).rejects.toThrow()
    })

    test('Solana transactions are accepted if the amount, mint and owner are valid (buy)', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        await expect(
            bobClient.addTransaction_Transfer(1151111081099710, validBuyReceipt, transferEvent),
        ).resolves.not.toThrow()
    })

    test('Solana transactions are accepted if the amount, mint and owner are valid (buy) and there is no pre token balance', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 1234567890n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: true,
        }

        await expect(
            bobClient.addTransaction_Transfer(
                1151111081099710,
                validBuyReceiptWithoutPreTokenBalance,
                transferEvent,
            ),
        ).resolves.not.toThrow()
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
        expect(transfer.chainId).toBe('solana-mainnet')
        expect(transfer.amount).toBe(4804294168682n)
        expect(transfer.messageId).toBe(threadParentId)
        expect(transfer.isBuy).toBe(false)
    })

    test('bob sees the transfer event in the channel stream', async () => {
        await waitFor(() => {
            const transferEvents = extractMemberBlockchainTransactions(bobClient, channelId)
            expect(transferEvents.length).toBe(3)
            const [event0, event1, event2] = transferEvents
            expect(BigInt(event0.amount)).toBe(4804294168682n)
            expect(BigInt(event1.amount)).toBe(4804294168682n)
            expect(BigInt(event2.amount)).toBe(1234567890n)
            expect(bin_toString(event0.sender)).toBe(bobSolanaWalletAddress)
            expect(bin_toString(event1.sender)).toBe(bobSolanaWalletAddress)
            expect(bin_toString(event2.sender)).toBe(bobSolanaWalletAddress)
            expect(event0.isBuy).toBe(false)
            expect(event1.isBuy).toBe(true)
            expect(event2.isBuy).toBe(true)
        })
    })
})
