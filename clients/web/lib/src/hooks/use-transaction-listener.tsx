import { useTransactionStore } from '../store/use-transactions-store'
import { ZionClient } from 'client/ZionClient'
import { useCredentialStore } from '../store/use-credential-store'
import { waitForTransaction } from '@wagmi/core'
import { useQueries } from '@tanstack/react-query'
import { BlockchainTransactionEvent, ZTEvent } from '../types/timeline-types'
import { BlockchainTransaction, BlockchainTransactionType } from '../types/web3-types'

export const useTransactionListener = (client: ZionClient | undefined, homeServerUrl: string) => {
    const transactions = useTransactionStore((state) => state.transactions)
    const deleteAndEmitTransaction = useTransactionStore((state) => state.deleteAndEmitTransaction)
    const credentials = useCredentialStore(
        (state) => state.matrixCredentialsMap[homeServerUrl] ?? undefined,
    )
    const isAuthenticated = credentials?.accessToken !== undefined

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
                await client.sendStateEvent(
                    transaction.data.parentSpaceId,
                    ZTEvent.BlockchainTransaction,
                    content,
                    transaction.hash, // need unique state_key
                )
            } catch (error) {
                console.error('Error sending state BlockchainTransaction event', error)
            }

            // TBD: This is backup if the above state event proves unreliable
            // this is a reliable way to send this event to other connected clients, but it's not an accurate event type
            // - sendEvent() encrypts messages by default and doesn't allow for specifying way to bypass encryption but Event.Reaction and EventType.RoomRedaction are not encrypted
            // - for this to be effective, need to include EventType.Reaction in the useSyncSpaceHierarchies onRoomTimelineEvent listener
            // void client.matrixClient?.sendEvent(
            //     transaction.data.parentSpaceId.networkId,
            //     EventType.Reaction, // or EventType.RoomRedaction to bypass encryption
            //     {
            //         transactionId: transaction.hash,
            //         roomId: transaction.data.parentSpaceId.networkId,
            //     },
            // )

            return
        default:
            return
    }
}
