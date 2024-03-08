import { useState, useCallback, useRef, useMemo } from 'react'
import { useTownsClient } from './use-towns-client'
import {
    TransactionStatus,
    WalletLinkTransactionContext,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { ethers } from 'ethers'
import { SignerUndefinedError, toError } from '../types/error-types'
import { queryClient, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useConnectivity } from './use-connectivity'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { isAddress } from 'viem'
import { useSpaceDapp } from './use-space-dapp'
import { useWeb3Context } from '../components/Web3ContextProvider'

export function useLinkWalletTransaction() {
    const { traceTransaction, ...rest } = useLinkTransactionBuilder()
    const { linkWallet } = useTownsClient()
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

export function useLinkedWallets() {
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
            enabled: !!loggedInWalletAddress && !!client,
            // b/c this query is only invalidated if the transaction hooks await the transaction to be mined (component could be unmounted before that)
            // we need to refetch on mount to make sure we have the latest data
            refetchOnMount: true,
        },
    )
}

/**
 * grab the root key for a linked wallet
 * this hook might be used in a context where the user is logged out and a client doen't exist
 * the chainId parameter is optional and should be used when the chainId is not available from useTownsClient
 */
export function useGetRootKeyFromLinkedWallet({
    walletAddress,
    chainId,
}: {
    walletAddress: string | undefined
    chainId?: number | undefined
}) {
    const { chainId: clientChainId } = useTownsClient()
    const _chainId = chainId ?? clientChainId
    const { provider } = useWeb3Context()
    const spaceDapp = useSpaceDapp({
        chainId: _chainId,
        provider,
    })

    return useQuery(
        blockchainKeys.rootKeyFromLinkedWallet(walletAddress ?? 'waitingForWalletAddress'),
        () => {
            if (!walletAddress || !spaceDapp) {
                return
            }
            const walletLink = spaceDapp.getWalletLink()
            return walletLink.getRootKeyForWallet(walletAddress)
        },
        {
            enabled: !!walletAddress && isAddress(walletAddress) && !!spaceDapp,
            staleTime: 1000 * 60 * 60 * 24,
            gcTime: 1000 * 60 * 60 * 24,
        },
    )
}
