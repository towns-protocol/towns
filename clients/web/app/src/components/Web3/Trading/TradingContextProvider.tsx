import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { Connection as SolanaConnection, VersionedTransaction } from '@solana/web3.js'
import { base64ToUint8Array } from '@river-build/sdk'
import { TransactionStatus } from 'use-towns-client'
import { env } from 'utils'
import { useSolanaWallet } from './useSolanaWallet'

export type SolanaTransactionRequest = {
    id: string
    transactionData: string
    token: {
        name: string
        symbol: string
        address: string
        amount: bigint
        decimals: number
    }
    signature?: string
    status: TransactionStatus
}

const TradingContext = createContext<{
    pendingSolanaTransaction: SolanaTransactionRequest | undefined
    failedSolanaTransactions: SolanaTransactionRequest[]
    sendSolanaTransaction: (transaction: SolanaTransactionRequest) => void
}>({
    sendSolanaTransaction: () => {},
    failedSolanaTransactions: [],
    pendingSolanaTransaction: undefined,
})

export const useTradingContext = () => {
    return useContext(TradingContext)
}

export const TradingContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { solanaWallet } = useSolanaWallet()
    const [pendingSolanaTransaction, setPendingSolanaTransaction] = React.useState<
        SolanaTransactionRequest | undefined
    >(undefined)

    const [failedSolanaTransactions, setFailedSolanaTransactions] = React.useState<
        SolanaTransactionRequest[]
    >([])

    const connection = useMemo(() => {
        if (!env.VITE_SOLANA_MAINNET_RPC_URL) {
            console.error('VITE_SOLANA_MAINNET_RPC_URL is not set')
            return undefined
        }
        return new SolanaConnection(env.VITE_SOLANA_MAINNET_RPC_URL)
    }, [])

    const sendSolanaTransaction = useCallback(
        async (transaction: SolanaTransactionRequest) => {
            if (!solanaWallet) {
                console.error('No Solana wallet')
                return
            }

            if (!connection) {
                console.error('No Solana connection')
                return
            }

            if (pendingSolanaTransaction) {
                console.error('No Solana connection')
                return
            }

            console.info('Sending Solana transaction:', transaction)
            setPendingSolanaTransaction(transaction)

            try {
                const versionedTransaction = VersionedTransaction.deserialize(
                    base64ToUint8Array(transaction.transactionData),
                )
                const signedTx = await solanaWallet.signTransaction(versionedTransaction)
                const rawTransaction = signedTx.serialize()
                const signature = await connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: true,
                    maxRetries: 5,
                })

                transaction.signature = signature
                setPendingSolanaTransaction(transaction)

                console.info('Solana Transaction sent:', signature)

                for (let i = 0; i < 30; i++) {
                    const txResult = await connection.getTransaction(signature, {
                        maxSupportedTransactionVersion: 0,
                    })
                    if (txResult) {
                        if (txResult.meta?.err) {
                            console.error('Solana Transaction failed:', txResult.meta?.err)
                            transaction.status = TransactionStatus.Failed
                        } else if (txResult.blockTime) {
                            console.log('Solana Transaction confirmed:', txResult)
                            transaction.status = TransactionStatus.Success
                        }
                    }

                    if (transaction.status !== TransactionStatus.Pending) {
                        // we got the result, break the loop
                        break
                    }
                    console.info('Waiting for Solana transaction confirmation...')
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }

                if (transaction.status !== TransactionStatus.Success) {
                    setFailedSolanaTransactions((prev) => [...prev, transaction])
                }
                setPendingSolanaTransaction(undefined)
            } catch (error) {
                console.error('Error sending Solana transaction:', error)
            }
            setPendingSolanaTransaction(undefined)
        },
        [solanaWallet, connection, setPendingSolanaTransaction, pendingSolanaTransaction],
    )

    console.log('Pending Solana Transaction: ', pendingSolanaTransaction)
    return (
        <TradingContext.Provider
            value={{ pendingSolanaTransaction, failedSolanaTransactions, sendSolanaTransaction }}
        >
            {children}
        </TradingContext.Provider>
    )
}
