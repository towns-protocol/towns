import { useState, useCallback, useRef, useMemo } from 'react'
import { useZionClient } from './use-zion-client'
import {
    TransactionStatus,
    WalletLinkTransactionContext,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { ethers } from 'ethers'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useTransactionStore } from '../store/use-transactions-store'
import { BlockchainTransactionType } from '../types/web3-types'
import { queryClient, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useConnectivity } from './use-connectivity'

export function useLinkWalletTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { linkWallet } = useZionClient()
    return {
        ...rest,
        linkWalletTransaction: useCallback(
            async function (
                rootKey: ethers.Signer | undefined,
                wallet: ethers.Signer | undefined,
            ): Promise<WalletLinkTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!rootKey || !wallet) {
                        // cannot sign the transaction. stop processing.
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }
                    // ok to proceed
                    return linkWallet(rootKey, wallet)
                })
            },
            [linkWallet, traceTransaction],
        ),
    }
}

export function useUnlinkWalletTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { removeLink } = useZionClient()
    return {
        ...rest,
        unlinkWalletTransaction: useCallback(
            async function (
                rootKey: ethers.Signer | undefined,
                walletAddress: string | undefined,
            ): Promise<WalletLinkTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!rootKey || !walletAddress) {
                        // cannot sign the transaction. stop processing.
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }
                    // ok to proceed
                    return removeLink(rootKey, walletAddress)
                })
            },
            [removeLink, traceTransaction],
        ),
    }
}

function useLinkTransactionBuilder() {
    const { waitWalletLinkTransaction } = useZionClient()
    const { loggedInWalletAddress } = useConnectivity()
    const [transactionContext, setTransactionContext] = useState<
        WalletLinkTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: transactionContext?.transaction?.hash,
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const traceTransaction = useCallback(
        async function (
            thunk: () => Promise<WalletLinkTransactionContext | undefined>,
        ): Promise<WalletLinkTransactionContext | undefined> {
            if (isTransacting.current) {
                // Transaction already in progress
                return undefined
            }
            let transactionResult: WalletLinkTransactionContext | undefined
            isTransacting.current = true
            try {
                transactionResult = createTransactionContext({ status: TransactionStatus.Pending })
                setTransactionContext(transactionResult)

                transactionResult = await thunk()

                setTransactionContext(transactionResult)

                if (transactionResult?.status === TransactionStatus.Pending) {
                    // No error and transaction is pending
                    // Save it to local storage so we can track it
                    if (transactionResult.transaction && transactionResult.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.LinkWallet,
                        })
                    }

                    // Wait for transaction to be mined
                    transactionResult = await waitWalletLinkTransaction(transactionResult)
                    if (loggedInWalletAddress) {
                        await queryClient.invalidateQueries(
                            blockchainKeys.linkedWallets(loggedInWalletAddress),
                        )
                    }
                    setTransactionContext(transactionResult)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: toError(e),
                })
                setTransactionContext(transactionResult)
            } finally {
                isTransacting.current = false
            }
            return transactionResult
        },
        [loggedInWalletAddress, waitWalletLinkTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        traceTransaction,
    }
}

export function useLinkedWallets() {
    const { loggedInWalletAddress } = useConnectivity()
    const { client } = useZionClient()
    return useQuery(
        blockchainKeys.linkedWallets(loggedInWalletAddress ?? 'waitingForLoggedUser'),
        () => {
            if (!client || !loggedInWalletAddress) {
                return []
            }
            return client.getLinkedWallets(loggedInWalletAddress)
        },
        {
            enabled: !!loggedInWalletAddress && !!client,
        },
    )
}
