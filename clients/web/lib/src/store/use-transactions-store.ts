import { useEffect, useState, useRef, useMemo } from 'react'
import {
    BlockchainStoreTransactions,
    BlockchainStoreTx,
} from '../client/BlockchainTransactionStore'
import { useZionClient } from '../hooks/use-zion-client'

export const useTransactionStore = () => {
    const [transactions, setTransactions] = useState<BlockchainStoreTransactions>({})
    const { client } = useZionClient()
    useEffect(() => {
        const handleChange = (transactions: BlockchainStoreTransactions) => {
            setTransactions(transactions)
        }

        client?.blockchainTransactionStore.on('transactions', handleChange)

        return () => {
            client?.blockchainTransactionStore.off('transactions', handleChange)
        }
    }, [client])

    return transactions
}

export const useOnTransactionUpdated = (callback: (args: BlockchainStoreTx) => void) => {
    const { client } = useZionClient()
    const cbRef = useRef(callback)
    cbRef.current = callback

    useEffect(() => {
        const cb = (args: BlockchainStoreTx) => cbRef.current(args)
        client?.blockchainTransactionStore.on('updatedTransaction', cb)
        return () => {
            client?.blockchainTransactionStore.off('updatedTransaction', cb)
        }
    }, [client])
}

export const useIsTransactionPending = (type: BlockchainStoreTx['type']) => {
    const transactions = useTransactionStore()
    return useMemo(
        () =>
            Object.values(transactions).some(
                (tx) => tx.type === type && (tx.status === 'pending' || tx.status === 'potential'),
            ),
        [transactions, type],
    )
}
