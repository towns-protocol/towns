import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { Connection as SolanaConnection, VersionedTransaction } from '@solana/web3.js'
import { base64ToUint8Array } from '@river-build/sdk'
import { env } from 'utils'
import { useSolanaWallet } from './useSolanaWallet'

const TradingContext = createContext<{
    transactions: string[]
    sendSolanaTransaction: (transaction: string) => void
}>({
    transactions: [],
    sendSolanaTransaction: () => {},
})

export const useTradingContext = () => {
    return useContext(TradingContext)
}

export const TradingContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { solanaWallet } = useSolanaWallet()
    const [solanaTxs, setSolanaTxs] = React.useState<string[]>([])

    const connection = useMemo(() => {
        if (!env.VITE_SOLANA_MAINNET_RPC_URL) {
            console.error('VITE_SOLANA_MAINNET_RPC_URL is not set')
            return undefined
        }
        return new SolanaConnection(env.VITE_SOLANA_MAINNET_RPC_URL)
    }, [])

    const sendSolanaTransaction = useCallback(
        async (transactionData: string) => {
            if (!solanaWallet) {
                console.error('No Solana wallet')
                return
            }

            if (!connection) {
                console.error('No Solana connection')
                return
            }
            const versionedTransaction = VersionedTransaction.deserialize(
                base64ToUint8Array(transactionData),
            )

            const signedTx = await solanaWallet.signTransaction(versionedTransaction)
            const rawTransaction = signedTx.serialize()
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 5,
            })
            setSolanaTxs([...solanaTxs, signature])
        },
        [solanaWallet, connection, setSolanaTxs, solanaTxs],
    )

    return (
        <TradingContext.Provider value={{ transactions: solanaTxs, sendSolanaTransaction }}>
            {children}
        </TradingContext.Provider>
    )
}
