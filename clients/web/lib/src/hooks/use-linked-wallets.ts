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
import { useSanctionedAddresses } from './use-sanctioned-addresses'
import { Address } from '@towns-protocol/web3'

export function useLinkEOAToRootKeyTransaction({
    onSuccess,
    onError,
}: {
    onSuccess?: () => Promise<void>
    onError?: (error?: Error) => Promise<void>
} = {}) {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder({ onSuccess, onError })
    const { linkEOAToRootKey } = useTownsClient()
    const { isSanctioned, isLoading: isSanctionsListLoading } = useSanctionedAddresses()

    const isLoading = useMemo(() => {
        return rest.isLoading || isSanctionsListLoading
    }, [rest.isLoading, isSanctionsListLoading])

    return {
        ...rest,
        isLoading,
        linkEOAToRootKeyTransaction: useCallback(
            async function (
                rootKey: ethers.Signer | undefined,
                wallet: ethers.Signer | undefined,
            ): Promise<WalletLinkTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!rootKey || !wallet) {
                        // cannot sign the transaction. stop processing.
                        await onError?.(new SignerUndefinedError())
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }

                    const address = await wallet.getAddress()
                    if (isSanctioned(address.toLowerCase() as Address)) {
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new Error(
                                "This wallet has been blocked by OFAC's Sanctions List",
                            ),
                        })
                    }

                    // ok to proceed
                    const result = await linkEOAToRootKey(rootKey, wallet)
                    return result as WalletLinkTransactionContext
                })
            },
            [linkEOAToRootKey, onError, traceTransaction, isSanctioned],
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
    const { unlinkViaRootKey } = useTownsClient()
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
                    return unlinkViaRootKey(rootKey, walletAddress)
                })
            },
            [unlinkViaRootKey, traceTransaction],
        ),
    }
}

export function useUnlinkViaCallerTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { unlinkViaCaller } = useTownsClient()
    return {
        ...rest,
        unlinkViaCallerTransaction: useCallback(
            async function (caller: ethers.Signer) {
                return traceTransaction(async () => unlinkViaCaller(caller))
            },
            [unlinkViaCaller, traceTransaction],
        ),
    }
}

function useLinkTransactionBuilder({
    onSuccess,
    onError,
}: { onSuccess?: () => Promise<void>; onError?: (error?: Error) => Promise<void> } = {}) {
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
                if (transactionResult?.status === TransactionStatus.Failed) {
                    await onError?.(transactionResult.error)
                } else if (transactionResult?.status === TransactionStatus.Success) {
                    await onSuccess?.()
                }
            }
            return transactionResult
        },
        [loggedInWalletAddress, onError, onSuccess, waitWalletLinkTransaction],
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

/**
 * Returns the linked wallets for the logged in wallet, excluding the logged in wallet address
 * This hook historically never returned the logged in wallet address, so we're filtering it out here in case the data source changes
 */
export function useLinkedWallets({ enabled = true } = {}) {
    const { loggedInWalletAddress } = useConnectivity()
    const { data, isLoading, error } = useLinkedWalletsForWallet({
        walletAddress: loggedInWalletAddress,
        enabled,
    })
    return useMemo(() => {
        return {
            data: data?.filter((w) => w.toLowerCase() !== loggedInWalletAddress?.toLowerCase()),
            isLoading,
            error,
        }
    }, [data, isLoading, error, loggedInWalletAddress])
}

export function useLinkedWalletsForWallet({
    walletAddress,
    enabled,
}: {
    walletAddress: string | undefined
    enabled?: boolean
}) {
    const { clientSingleton } = useTownsClient()
    return useQuery(
        blockchainKeys.linkedWallets(walletAddress ?? 'waitingForLoggedUser'),
        () => {
            if (!clientSingleton || !walletAddress) {
                console.error('useLinkedWallets - no clientSingleton or logged in wallet address')
                return []
            }
            return clientSingleton.getLinkedWalletsWithDelegations(walletAddress)
        },
        {
            enabled: enabled && !!walletAddress && !!clientSingleton,
            staleTime: 60 * 1000 * 5,
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

    return useQuery(
        blockchainKeys.rootKeyFromLinkedWallet(walletAddress ?? 'waitingForWalletAddress'),
        async () => {
            if (!walletAddress || !spaceDapp) {
                return
            }
            const offlineWalletAddressMap = useOfflineStore.getState().offlineWalletAddressMap

            // if we have the root key cached, return it
            const cachedRootKey = Object.keys(offlineWalletAddressMap).find(
                (key) => offlineWalletAddressMap[key] === walletAddress,
            )
            if (cachedRootKey) {
                return cachedRootKey
            }

            const walletLink = spaceDapp.getWalletLink()
            const returnVal = await walletLink.getRootKeyForWallet(walletAddress)
            return returnVal
        },
        {
            enabled: !!walletAddress && isAddress(walletAddress) && !!spaceDapp,
            gcTime: staleTime24Hours,
            staleTime: staleTime24Hours,
        },
    )
}
