import { ConfirmedTransactionMeta } from '@solana/web3.js'

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

    // If either balance is not found, return 0
    if (!preTokenBalance || !postTokenBalance) {
        return 0n
    }
    // Calculate the difference between post and pre balances
    // A positive value indicates tokens received, negative indicates tokens sent
    const preAmount = BigInt(preTokenBalance.uiTokenAmount?.amount || '0')
    const postAmount = BigInt(postTokenBalance.uiTokenAmount?.amount || '0')

    // Calculate the absolute difference between pre and post balances
    return postAmount > preAmount ? postAmount - preAmount : preAmount - postAmount
}
