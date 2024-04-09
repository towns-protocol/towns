import { useEffect, useState, useRef, useMemo } from 'react'
import {
    BlockchainStoreTransactions,
    BlockchainStoreTx,
} from '../client/BlockchainTransactionStore'
import { useTownsClient } from '../hooks/use-towns-client'

export const useTransactionStore = () => {
    const [transactions, setTransactions] = useState<BlockchainStoreTransactions>({})
    const { clientSingleton } = useTownsClient()
    useEffect(() => {
        const handleChange = (transactions: BlockchainStoreTransactions) => {
            setTransactions(transactions)
        }

        clientSingleton?.blockchainTransactionStore.on('transactions', handleChange)

        return () => {
            clientSingleton?.blockchainTransactionStore.off('transactions', handleChange)
        }
    }, [clientSingleton])

    return transactions
}

export const useOnTransactionUpdated = (callback: (args: BlockchainStoreTx) => void) => {
    const { clientSingleton } = useTownsClient()
    const cbRef = useRef(callback)
    cbRef.current = callback

    useEffect(() => {
        const cb = (args: BlockchainStoreTx) => cbRef.current(args)
        clientSingleton?.blockchainTransactionStore.on('updatedTransaction', cb)
        return () => {
            clientSingleton?.blockchainTransactionStore.off('updatedTransaction', cb)
        }
    }, [clientSingleton])
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
