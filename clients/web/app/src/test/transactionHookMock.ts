import { waitFor } from '@testing-library/react'
import { ContractReceipt, ContractTransaction } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
import * as zionClient from 'use-zion-client'
import { Mock, vi } from 'vitest'

const loadingContext = {
    status: zionClient.TransactionStatus.Pending,
    transaction: undefined,
    receipt: undefined,
    data: undefined,
}

const pendingContext = {
    status: zionClient.TransactionStatus.Pending,
    transaction: { hash: '0xhash', status: 0 } as unknown as ContractTransaction,
    receipt: undefined,
    data: {
        slug: 'some-room-id',
        networkId: 'some-room-id',
        protocol: zionClient.SpaceProtocol.Matrix,
    },
}
const successContext = {
    status: zionClient.TransactionStatus.Success,
    transaction: { hash: '0xhash', status: 1 } as unknown as ContractTransaction,
    receipt: {} as ContractReceipt,
    data: {
        slug: 'some-room-id',
        networkId: 'some-room-id',
        protocol: zionClient.SpaceProtocol.Matrix,
    },
}

const failedWithoutTransactionContext = {
    status: zionClient.TransactionStatus.Failed,
    transaction: undefined,
    receipt: undefined,
    data: undefined,
    error: { name: 'whatever', message: 'some error' },
}

const failedWithTransactionContext = {
    status: zionClient.TransactionStatus.Failed,
    transaction: { hash: '0xhash', status: 0 } as unknown as ContractTransaction,
    receipt: undefined,
    data: {
        slug: 'some-room-id',
        networkId: 'some-room-id',
        protocol: zionClient.SpaceProtocol.Matrix,
    },
    error: { name: 'whatever', message: 'some error' },
}

type TransactionFnNames = 'createSpaceTransactionWithMemberRole' | 'createChannelTransaction'

type UseMockTransactionReturn = {
    isLoading: boolean
    data: zionClient.RoomIdentifier | undefined
    error: Error | undefined
    transactionHash: string | undefined
    transactionStatus: zionClient.TransactionStatus
}

export type UseMockCreateSpaceReturn = UseMockTransactionReturn & {
    createSpaceTransactionWithMemberRole: Mock
}

export type UseMockCreateChannelReturn = UseMockTransactionReturn & {
    createChannelTransaction: Mock
}

// useCreateSpaceTransaction/useCreateChannelTransaction contains calls to other lib functions whose references aren't replaced by mocking: createSpaceTransaction, waitForCreateSpaceTransaction, etc
// Workarounds:
// 1. Could mock a logged in state - useWithCatch wrapped around createSpaceTransaction is failing b/c not logged in, and ultimately causes test failures
// 2. Could mock the whole hook, which is what the below does. Kind of a hack but works for now
export const mockCreateTransactionWithSpy = (transactionFunctionName: TransactionFnNames) => {
    const createTransactionSpy = vi.fn()

    const useMockedCreateTransaction = (
        outcome: 'success' | 'failWithTransaction' | 'failWithoutTransaction' = 'success',
    ): UseMockCreateSpaceReturn | UseMockCreateChannelReturn => {
        const [transactionContext, setTransactionContext] = useState<
            zionClient.TransactionContext<zionClient.RoomIdentifier> | undefined
        >(undefined)

        const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
            return {
                data: transactionContext?.data,
                isLoading: transactionContext?.status === zionClient.TransactionStatus.Pending,
                transactionHash: transactionContext?.transaction?.hash,
                transactionStatus: transactionContext?.status ?? zionClient.TransactionStatus.None,
                error: transactionContext?.error,
            }
        }, [transactionContext])

        const createTransactionMockFn = createTransactionSpy.mockImplementation(
            useCallback(async () => {
                await waitFor(() => {
                    setTransactionContext(loadingContext)
                })

                await waitFor(() => {
                    setTransactionContext(pendingContext)
                })

                await waitFor(() => {
                    if (outcome === 'success') {
                        setTransactionContext(successContext)
                    } else if (outcome === 'failWithoutTransaction') {
                        setTransactionContext(failedWithoutTransactionContext)
                    } else {
                        setTransactionContext(failedWithTransactionContext)
                    }
                })
            }, [outcome]),
        )

        const txData = {
            isLoading,
            data,
            error,
            transactionHash,
            transactionStatus,
        }

        if (transactionFunctionName === 'createSpaceTransactionWithMemberRole') {
            return {
                ...txData,
                createSpaceTransactionWithMemberRole: createTransactionMockFn,
            }
        } else {
            return {
                ...txData,
                createChannelTransaction: createTransactionMockFn,
            }
        }
    }

    return { useMockedCreateTransaction, createTransactionSpy }
}
