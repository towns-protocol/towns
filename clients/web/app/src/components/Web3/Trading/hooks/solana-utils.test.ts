import { ConfirmedTransactionMeta } from '@solana/web3.js'
import { extractTransferAmountFromMeta } from './solana-utils'

/**
 * Transaction data in both EVM and Solana chains can be complex and noisy.
 *
 * For Solana, transactions contain multiple instructions, account updates,
 * and token balance changes. We need to carefully compare pre and post token balances
 * for specific mint addresses and wallet owners to determine the actual transfer amount.
 */

test('extractTransferAmountFromMeta', () => {
    const mintAddress = 'mintAddress'
    const walletAddress = 'walletAddress'

    const meta: ConfirmedTransactionMeta = {
        fee: 0,
        err: null,
        preBalances: [],
        postBalances: [],
        preTokenBalances: [
            {
                accountIndex: 0,
                uiTokenAmount: {
                    amount: '999999999999999999',
                    decimals: 9,
                    uiAmount: 999999999999.0,
                },
                mint: 'unrelated',
                owner: walletAddress,
            },
            {
                accountIndex: 1,
                uiTokenAmount: {
                    amount: '4804294168682',
                    decimals: 9,
                    uiAmount: 4.804294168682,
                },
                mint: mintAddress,
                owner: walletAddress,
            },
        ],
        postTokenBalances: [
            {
                accountIndex: 0,
                uiTokenAmount: {
                    amount: '11111',
                    decimals: 9,
                    uiAmount: 1111111.0,
                },
                mint: 'unrelated',
                owner: walletAddress,
            },
            {
                accountIndex: 0,
                uiTokenAmount: {
                    amount: '0',
                    decimals: 9,
                    uiAmount: 0,
                },
                mint: mintAddress,
                owner: walletAddress,
            },
        ],
    }

    const amount = extractTransferAmountFromMeta(meta, mintAddress, walletAddress)
    expect(amount).toBe(4804294168682n)
})
