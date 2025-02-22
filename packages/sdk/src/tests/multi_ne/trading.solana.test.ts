import { Client } from '../../client'
import { makeTestClient, makeUniqueSpaceStreamId, waitFor } from '../testUtils'
import { makeUniqueChannelStreamId } from '../../id'
import { PlainMessage } from '@bufbuild/protobuf'
import { BlockchainTransaction_TokenTransfer } from '@river-build/proto'
import { SolanaTransactionReceipt } from '../../types'
import { bin_fromHexString, bin_fromString, bin_toString } from '@river-build/dlog'
import { extractMemberBlockchainTransactions } from './trading.test'

describe('Trading Solana', () => {
    let bobClient: Client
    const mintAddress = '2HQXvda5sUjGLRKLG6LEqSctARYJboufSfG2Qciqmoon'
    const bobSolanaWalletAddress = '3cfwgyZY7uLNEv72etBQArWSoTzmXEm7aUmW3xE5xG4P'
    let spaceId!: string
    let channelId!: string
    let threadParentId!: string

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
                '4uPV4YciNkRoRqaN5bsDw4HzPTCuavM94sbdaZPkaVVEXkyaNNT4KLpuvwBsyJUkzzzjLXpVx88dRswJ6tRp41VG',
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

    test('Solana transactions are accepted if the amount, mint and owner are valid', async () => {
        const transferEvent: PlainMessage<BlockchainTransaction_TokenTransfer> = {
            amount: 4804294168682n.toString(),
            address: bin_fromString(mintAddress),
            sender: bin_fromString(bobSolanaWalletAddress),
            messageId: bin_fromHexString(threadParentId),
            channelId: bin_fromHexString(channelId),
            isBuy: false,
        }
        await bobClient.addTransaction_Transfer(1151111081099710, validSellReceipt, transferEvent)
    })

    test('bob sees the transfer event in the channel stream', async () => {
        await waitFor(() => {
            const transferEvents = extractMemberBlockchainTransactions(bobClient, channelId)
            expect(transferEvents.length).toBe(1)
            const event0 = transferEvents[0]
            expect(BigInt(event0!.amount)).toBe(4804294168682n)
            expect(bin_toString(event0!.sender)).toBe(bobSolanaWalletAddress)
        })
    })
})
