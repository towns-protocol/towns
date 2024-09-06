import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { useQueryClient } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { Permission } from '@river-build/web3'

export function useSetChannelPermissionOverrides() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const {
        setChannelPermissionOverridesTransaction,
        waitForSetChannelPermissionOverridesTransaction:
            waitForSetChannelPermissionOverridesTransaction,
    } = useTownsClient()
    const queryClient = useQueryClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    // update role with new permissions, tokens, and users
    const _setChannelPermissionOverridesTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            channelId: string,
            roleId: number,
            permissions: Permission[],
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn('useSetChannelPermissionOverrides', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined

            if (!signer) {
                console.error('useSetChannelPermissionOverrides', 'Signer is undefined')
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }

            isTransacting.current = true

            try {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Pending,
                })
                setTransactionContext(transactionResult)
                transactionResult = await setChannelPermissionOverridesTransaction(
                    spaceNetworkId,
                    channelId,
                    roleId,
                    permissions,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForSetChannelPermissionOverridesTransaction(
                        transactionResult,
                    )
                    setTransactionContext(transactionResult)

                    if (transactionResult?.status === TransactionStatus.Success) {
                        const queryKey = blockchainKeys.channelPermissionOverrides(
                            spaceNetworkId,
                            roleId,
                            channelId,
                        )
                        await queryClient.invalidateQueries({
                            queryKey,
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useSetChannelPermissionOverrides', 'Transaction failed', e)
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
        [
            queryClient,
            setChannelPermissionOverridesTransaction,
            waitForSetChannelPermissionOverridesTransaction,
        ],
    )

    useEffect(() => {
        console.log('useSetChannelPermissionOverrides', 'states', {
            isLoading,
            data,
            error,
            transactionStatus,
            transactionHash,
        })
    }, [data, error, isLoading, transactionHash, transactionStatus])

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        setChannelPermissionOverridesTransaction: _setChannelPermissionOverridesTransaction,
    }
}

export function useClearChannelPermissionOverrides() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const {
        clearChannelPermissionOverridesTransaction,
        waitForClearChannelPermissionOverridesTransaction,
    } = useTownsClient()
    const queryClient = useQueryClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    // update role with new permissions, tokens, and users
    const _clearChannelPermissionOverridesTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            channelId: string,
            roleId: number,
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn(
                    'useClearChannelPermissionOverrides',
                    'Transaction already in progress',
                )
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined

            if (!signer) {
                console.error('useClearChannelPermissionOverrides', 'Signer is undefined')
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }

            isTransacting.current = true

            try {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Pending,
                })
                setTransactionContext(transactionResult)
                transactionResult = await clearChannelPermissionOverridesTransaction(
                    spaceNetworkId,
                    channelId,
                    roleId,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForClearChannelPermissionOverridesTransaction(
                        transactionResult,
                    )
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        const queryKey = blockchainKeys.channelPermissionOverrides(
                            spaceNetworkId,
                            roleId,
                            channelId,
                        )

                        await queryClient.invalidateQueries({
                            queryKey,
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useClearChannelPermissionOverrides', 'Transaction failed', e)
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
        [
            clearChannelPermissionOverridesTransaction,
            queryClient,
            waitForClearChannelPermissionOverridesTransaction,
        ],
    )

    useEffect(() => {
        console.log('useClearChannelPermissionOverrides', 'states', {
            isLoading,
            data,
            error,
            transactionStatus,
            transactionHash,
        })
    }, [data, error, isLoading, transactionHash, transactionStatus])

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        clearChannelPermissionOverridesTransaction: _clearChannelPermissionOverridesTransaction,
    }
}
