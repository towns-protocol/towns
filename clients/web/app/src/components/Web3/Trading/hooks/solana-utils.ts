import { BlockchainTransaction_TokenTransfer, PlainMessage } from '@towns-protocol/proto'
import { SolanaTransactionReceipt } from '@towns-protocol/sdk'
import { ConfirmedTransactionMeta, VersionedTransactionResponse } from '@solana/web3.js'
import { bin_fromHexString, bin_fromString } from '@towns-protocol/dlog'

/**
 * Extracts the token transfer amount from a Solana transaction metadata.
 *
 * This function analyzes the pre and post token balances in a transaction to determine
 * how many tokens were transferred for a specific mint (token) and wallet owner.
 *
 * @param meta - The confirmed transaction metadata containing token balance information
 * @param mintAddress - The address of the token mint (token contract) to track
 * @param ownerAddress - The wallet address of the token owner
 * @returns The absolute amount of tokens transferred as a bigint, or 0n if balances can't be found
 *
 * Note: This returns the absolute difference between pre and post balances,
 * so it works for both sending (decrease in balance) and receiving (increase in balance).
 */

export function extractTransferAmountFromMeta(
    meta: ConfirmedTransactionMeta,
    mintAddress: string,
    ownerAddress: string,
): bigint {
    // Find the pre and post token balances for the specified token and wallet
    const preTokenBalance = meta.preTokenBalances?.find(
        (balance) => balance.mint === mintAddress && balance.owner === ownerAddress,
    )

    const postTokenBalance = meta.postTokenBalances?.find(
        (balance) => balance.mint === mintAddress && balance.owner === ownerAddress,
    )

    // If both balances aren't found, return 0
    if (!preTokenBalance && !postTokenBalance) {
        return 0n
    }
    // Calculate the difference between post and pre balances
    // A positive value indicates tokens received, negative indicates tokens sent
    const preAmount = BigInt(preTokenBalance?.uiTokenAmount?.amount || '0')
    const postAmount = BigInt(postTokenBalance?.uiTokenAmount?.amount || '0')

    // Calculate the absolute difference between pre and post balances
    return postAmount > preAmount ? postAmount - preAmount : preAmount - postAmount
}

export function createSendTokenTransferDataSolana(
    transactionResponse: VersionedTransactionResponse,
    mintAddress: string,
    ownerAddress: string,
    channelId: string,
    messageId: string,
    isBuy: boolean,
):
    | {
          receipt: SolanaTransactionReceipt
          event: PlainMessage<BlockchainTransaction_TokenTransfer>
      }
    | undefined {
    if (!transactionResponse.meta) {
        return undefined
    }
    const amount = extractTransferAmountFromMeta(
        transactionResponse.meta,
        mintAddress,
        ownerAddress,
    )
    if (amount === 0n) {
        return undefined
    }

    const event: PlainMessage<BlockchainTransaction_TokenTransfer> = {
        amount: amount.toString(),
        address: bin_fromString(mintAddress),
        sender: bin_fromString(ownerAddress),
        messageId: bin_fromHexString(messageId),
        channelId: bin_fromHexString(channelId),
        isBuy: isBuy,
    }

    const preTokenBalances =
        transactionResponse.meta.preTokenBalances?.map((balance) => ({
            amount: {
                amount: balance.uiTokenAmount?.amount ?? '0',
                decimals: balance.uiTokenAmount?.decimals ?? 9,
            },
            mint: balance.mint,
            owner: balance.owner ?? '',
        })) ?? []
    const postTokenBalances =
        transactionResponse.meta.postTokenBalances?.map((balance) => ({
            amount: {
                amount: balance.uiTokenAmount?.amount ?? '0',
                decimals: balance.uiTokenAmount?.decimals ?? 9,
            },
            mint: balance.mint,
            owner: balance.owner ?? '',
        })) ?? []

    const receipt: SolanaTransactionReceipt = {
        meta: {
            preTokenBalances: preTokenBalances.filter(
                (balance) => balance.mint === mintAddress && balance.owner === ownerAddress,
            ),
            postTokenBalances: postTokenBalances.filter(
                (balance) => balance.mint === mintAddress && balance.owner === ownerAddress,
            ),
        },
        slot: BigInt(transactionResponse.slot),
        transaction: { signatures: transactionResponse.transaction.signatures },
    }

    /// Temp workaround for the fact that the preTokenBalances are not always updated
    if (
        !receipt.meta.preTokenBalances.some(
            (balance) => balance.mint === mintAddress && balance.owner === ownerAddress,
        )
    ) {
        // use the decimals from the post token balance
        const decimals = postTokenBalances.find((balance) => balance.mint === mintAddress)?.amount
            .decimals
        receipt.meta.preTokenBalances.push({
            amount: {
                amount: '0',
                decimals: decimals ?? 9,
            },
            mint: mintAddress,
            owner: ownerAddress,
        })
    }

    return { event, receipt }
}
