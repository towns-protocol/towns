import { useState, useCallback, useRef, useMemo } from 'react'
import { useTownsClient } from './use-towns-client'
import {
    TransactionStatus,
    WalletLinkTransactionContext,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { ethers } from 'ethers'
import { SignerUndefinedError, toError } from '../types/error-types'
import { queryClient, staleTime24Hours, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useConnectivity } from './use-connectivity'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { isAddress } from 'viem'
import { useSpaceDapp } from './use-space-dapp'
import { useOfflineStore } from '../store/use-offline-store'
import { useTownsContext } from '../components/TownsContextProvider'

export function useLinkEOAToRootKeyTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { linkEOAToRootKey } = useTownsClient()
    return {
        ...rest,
        linkEOAToRootKeyTransaction: useCallback(
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
                    return linkEOAToRootKey(rootKey, wallet)
                })
            },
            [linkEOAToRootKey, traceTransaction],
        ),
    }
}

/**
 * Only use this to link the smart account
 * @returns
 */
export function useLinkCallerToRootKey() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { linkCallerToRootKey } = useTownsClient()
    return {
        ...rest,
        linkCallerToRootKeyTransaction: useCallback(
            async function (
                rootKey: ethers.Signer | undefined,
            ): Promise<WalletLinkTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!rootKey) {
                        // cannot sign the transaction. stop processing.
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }
                    // ok to proceed
                    return linkCallerToRootKey(rootKey)
                })
            },
            [linkCallerToRootKey, traceTransaction],
        ),
    }
}

export function useUnlinkWalletTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { removeLink } = useTownsClient()
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
    const { waitWalletLinkTransaction } = useTownsClient()
    const { loggedInWalletAddress } = useConnectivity()
    const [transactionContext, setTransactionContext] = useState<
        WalletLinkTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
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
                    // Wait for transaction to be mined
                    transactionResult = await waitWalletLinkTransaction(transactionResult)
                    if (loggedInWalletAddress) {
                        await queryClient.invalidateQueries({
                            queryKey: blockchainKeys.linkedWallets(loggedInWalletAddress),
                        })
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

export function useLinkedWallets({ enabled = true } = {}) {
    const { loggedInWalletAddress } = useConnectivity()
    const { client } = useTownsClient()
    return useQuery(
        blockchainKeys.linkedWallets(loggedInWalletAddress ?? 'waitingForLoggedUser'),
        () => {
            if (!client || !loggedInWalletAddress) {
                return []
            }
            return client.getLinkedWallets(loggedInWalletAddress)
        },
        {
            enabled: enabled && !!loggedInWalletAddress && !!client,
            // b/c this query is only invalidated if the transaction hooks await the transaction to be mined (component could be unmounted before that)
            // we need to refetch on mount to make sure we have the latest data
            refetchOnMount: true,
        },
    )
}

/**
 * grab the root key for a linked wallet
 */
export function useGetRootKeyFromLinkedWallet({
    walletAddress,
}: {
    walletAddress: string | undefined
}) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const { offlineWalletAddressMap, setOfflineWalletAddress } = useOfflineStore()

    return useQuery(
        blockchainKeys.rootKeyFromLinkedWallet(walletAddress ?? 'waitingForWalletAddress'),
        async () => {
            if (!walletAddress || !spaceDapp) {
                return
            }

            // if we have the root key cached, return it
            const cachedRootKey = Object.keys(offlineWalletAddressMap).find(
                (key) => offlineWalletAddressMap[key] === walletAddress,
            )
            if (cachedRootKey) {
                return cachedRootKey
            }

            const walletLink = spaceDapp.getWalletLink()
            const returnVal = await walletLink.getRootKeyForWallet(walletAddress)
            console.log('useGetRootKeyFromLinkedWallet - setting offline wallet address', {
                rootKey: returnVal,
                walletAddress: walletAddress,
            })
            setOfflineWalletAddress(returnVal, walletAddress)
            return returnVal
        },
        {
            enabled: !!walletAddress && isAddress(walletAddress) && !!spaceDapp,
            gcTime: staleTime24Hours,
            staleTime: staleTime24Hours,
        },
    )
}
