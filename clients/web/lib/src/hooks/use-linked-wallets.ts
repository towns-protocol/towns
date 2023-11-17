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

export function useLinkWalletTransaction() {
    const { linkWallet, removeLink, waitWalletLinkTransaction } = useZionClient()
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
        [waitWalletLinkTransaction],
    )

    const linkWalletTransaction = useCallback(
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
    )

    const unlinkWalletTransaction = useCallback(
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
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        linkWalletTransaction,
        unlinkWalletTransaction,
    }
}
