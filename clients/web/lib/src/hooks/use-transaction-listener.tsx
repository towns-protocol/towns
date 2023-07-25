import { BlockchainTransaction, BlockchainTransactionType } from '../types/web3-types'
import { BlockchainTransactionEvent, ZTEvent } from '../types/timeline-types'

import { ZionClient } from '../client/ZionClient'
import { makeRoomIdentifier } from '../types/room-identifier'
import { useTransactionStore } from '../store/use-transactions-store'
import { useQueries } from '../query/queryClient'
import { waitForTransaction } from 'wagmi/actions'
import { useCredentialStore } from '../store/use-credential-store'

export const useTransactionListener = (
    client: ZionClient | undefined,
    homeServerUrl: string,
    casablancaServerUrl: string | undefined,
) => {
    const transactions = useTransactionStore((state) => state.transactions)
    const deleteAndEmitTransaction = useTransactionStore((state) => state.deleteAndEmitTransaction)
    const credentialsM = useCredentialStore(
        (state) => state.matrixCredentialsMap[homeServerUrl] ?? undefined,
    )
    const credentialsC = useCredentialStore(
        (state) => state.casablancaCredentialsMap[casablancaServerUrl ?? ''] ?? undefined,
    )

    const isAuthenticated = credentialsM !== undefined || credentialsC !== undefined

    useQueries({
        queries: Object.values(transactions).map((transaction) => {
            return {
                queryKey: ['transaction', transaction.hash],
                enabled: transaction.hash && client && isAuthenticated,
                queryFn: async () => {
                    return await waitForTransaction({
                        hash: transaction.hash,
                    })
                },
                onSuccess: async () => {
                    if (!client) {
                        return
                    }
                    await onSuccessfulTransaction(client, transaction)
                    deleteAndEmitTransaction(transaction.hash, true)
                },
                onError: (_error: Error) => {
                    deleteAndEmitTransaction(transaction.hash, false)
                },
            }
        }),
    })
}

async function onSuccessfulTransaction(client: ZionClient, transaction: BlockchainTransaction) {
    if (!transaction.data) {
        return
    }
    switch (transaction.type) {
        case BlockchainTransactionType.CreateChannel:
            if (!transaction.data.parentSpaceId || !client) {
                return
            }

            try {
                const content: BlockchainTransactionEvent['content'] = transaction
                // Important for matrix:
                // on a successful blockchain transaction, resync the space, so that the user will get the latest channels
                // For casablanca it works differently and this probably is potentially not needed
                await client.sendBlockTxn(makeRoomIdentifier(transaction.data.parentSpaceId), {
                    kind: ZTEvent.BlockchainTransaction,
                    content,
                })
            } catch (error) {
                console.error('Error sending state BlockchainTransaction event', error)
            }
            return
        default:
            return
    }
}
