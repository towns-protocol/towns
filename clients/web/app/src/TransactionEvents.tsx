import { useQueries } from '@tanstack/react-query'
import { useWeb3Context } from 'use-zion-client'
import { ContractReceipt } from 'ethers'
import { useTransactionStore } from 'store/transactionsStore'
import { useAuth } from 'hooks/useAuth'

const useWaitForTransactions = () => {
    const transactions = useTransactionStore((state) => state.transactions)
    const deleteStoredTransaction = useTransactionStore((state) => state.deleteTransaction)
    const { provider } = useWeb3Context()
    const { isAuthenticatedAndConnected } = useAuth()

    useQueries({
        queries: Object.values(transactions).map((transaction) => {
            return {
                queryKey: ['transaction', transaction.hash],
                enabled: isAuthenticatedAndConnected,
                queryFn: async () => {
                    // using ANY wagmi method causes this to resolve more quickly than the transaction's own .wait() and I'm dont know why (see lib/ZionClient.waitForCreateSpaceTransaction)
                    // wagmi.fetchTransaction or wagmi.waitForTransaction
                    //
                    // const fetchedTx = await wagmi.fetchTransaction({
                    //     hash: transaction.hash as `0x${string}`,
                    // })
                    // const receipt = await fetchedTx.wait()
                    // return receipt

                    // using ethers directly, this resolves at the same time as the transaction's own .wait()
                    // perhaps we would see more timely resolves if we switch to wagmi in lib
                    const fetchedTx = await provider?.getTransaction(transaction.hash)
                    if (!fetchedTx) {
                        throw new Error('Transaction not found')
                    }
                    const receipt = await fetchedTx.wait()
                    return receipt
                },
                onSuccess: (receipt: ContractReceipt) => {
                    if (receipt.status === 1) {
                        // success, notify
                        console.log('[TransactionEvents] successful transaction', receipt)
                    } else {
                        // failure, notify
                        console.log('[TransactionEvents] failed transaction', receipt)
                    }

                    deleteStoredTransaction(transaction.hash)
                },
                onError: (_error: Error) => {
                    deleteStoredTransaction(transaction.hash)
                },
            }
        }),
    })
}

export const TransactionEvents = () => {
    useWaitForTransactions()
    return null
}
