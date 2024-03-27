import { queryClient, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTownsClient } from './use-towns-client'
import {
    BanUnbanWalletTransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { SignerUndefinedError, toError } from '../types/error-types'
import { ethers } from 'ethers'

function useBanUnbanTransactionBuilder() {
    const { waitForBanUnbanTransaction: waitForBanTransaction, client } = useTownsClient()
    const [transactionContext, setTransactionContext] = useState<
        BanUnbanWalletTransactionContext | undefined
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
            contextBuilder: () => Promise<BanUnbanWalletTransactionContext | undefined>,
        ): Promise<BanUnbanWalletTransactionContext | undefined> {
            if (isTransacting.current) {
                return undefined
            }

            let transactionContext: BanUnbanWalletTransactionContext | undefined
            isTransacting.current = true
            try {
                transactionContext = createTransactionContext({ status: TransactionStatus.Pending })
                setTransactionContext(transactionContext)
                transactionContext = await contextBuilder()
                if (transactionContext?.status === TransactionStatus.Pending) {
                    transactionContext = await waitForBanTransaction(transactionContext)
                    setTransactionContext(transactionContext)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                transactionContext = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: toError(e),
                })
                setTransactionContext(transactionContext)
            } finally {
                isTransacting.current = false

                // Perform side effects
                if (
                    transactionContext?.status === TransactionStatus.Success &&
                    transactionContext &&
                    transactionContext.data
                ) {
                    const spaceId = transactionContext.data.spaceId
                    const walletAddress = transactionContext.data.walletAddress

                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.walletAddressIsBanned(spaceId, walletAddress),
                    })
                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.bannedWalletAddresses(spaceId),
                    })

                    // Remove user from space if ban was successful
                    if (transactionContext.data.isBan) {
                        await client?.removeUser(spaceId, walletAddress)
                    }
                }
            }
        },
        [waitForBanTransaction, client],
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

export function useBanTransaction() {
    const { traceTransaction, ...rest } = useBanUnbanTransactionBuilder()
    const { banTransaction } = useTownsClient()
    return {
        banTransaction: useCallback(
            async function (
                signer: ethers.Signer | undefined,
                spaceId: string,
                userId: string,
            ): Promise<BanUnbanWalletTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!signer) {
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }
                    return banTransaction(spaceId, userId, signer)
                })
            },
            [traceTransaction, banTransaction],
        ),
        ...rest,
    }
}

export function useUnbanTransaction() {
    const { traceTransaction, ...rest } = useBanUnbanTransactionBuilder()
    const { unbanTransaction } = useTownsClient()
    return {
        unbanTransaction: useCallback(
            async function (
                signer: ethers.Signer | undefined,
                spaceId: string,
                userId: string,
            ): Promise<BanUnbanWalletTransactionContext | undefined> {
                return traceTransaction(async () => {
                    if (!signer) {
                        return createTransactionContext({
                            status: TransactionStatus.Failed,
                            error: new SignerUndefinedError(),
                        })
                    }
                    return unbanTransaction(spaceId, userId, signer)
                })
            },
            [traceTransaction, unbanTransaction],
        ),
        ...rest,
    }
}

export const useBannedWalletAddresses = (spaceId?: string) => {
    const { spaceDapp } = useTownsClient()

    async function getBannedUsers(spaceId?: string) {
        if (!spaceDapp || !spaceId) {
            return
        }
        return await spaceDapp.bannedWalletAddresses(spaceId)
    }

    const data = useQuery(
        blockchainKeys.bannedWalletAddresses(spaceId ?? ''),
        () => getBannedUsers(spaceId),
        {
            enabled: !!spaceId,
            refetchOnMount: true,
        },
    )

    return { userIds: data.data, isLoading: data.isLoading }
}

export function useWalletAddressIsBanned(spaceId?: string, walletAddress?: string) {
    const { client } = useTownsClient()

    const userIsBanned = useCallback(async () => {
        if (!client || !spaceId || !walletAddress) {
            return
        }
        return await client?.walletAddressIsBanned(spaceId, walletAddress)
    }, [spaceId, walletAddress, client])

    const isEnabled =
        spaceId && walletAddress ? spaceId.length > 0 && walletAddress.length > 0 : false
    const data = useQuery(
        blockchainKeys.walletAddressIsBanned(spaceId ?? '', walletAddress ?? ''),
        userIsBanned,
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )
    return { isBanned: data.data ?? false, isLoading: data.isLoading }
}
