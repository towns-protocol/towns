import { waitFor } from '@testing-library/react'
import { ContractReceipt, ContractTransaction } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
// eslint-disable-next-line no-restricted-imports
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

const failedWithMatrixPermissionContext = {
    status: zionClient.TransactionStatus.Failed,
    transaction: undefined,
    receipt: undefined,
    data: undefined,
    error: { name: 'M_FORBIDDEN', message: 'some error' },
}

type TransactionFnNames =
    | 'createSpaceTransactionWithRole'
    | 'createChannelTransaction'
    | 'updateChannelTransaction'
    | 'deleteRoleTransaction'
    | 'createRoleTransaction'
    | 'updateRoleTransaction'

type UseMockTransactionReturn = {
    isLoading: boolean
    // TODO: fix this type - likely a generic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any | undefined
    error: Error | undefined
    transactionHash: string | undefined
    transactionStatus: zionClient.TransactionStatus
}

export type UseMockCreateSpaceReturn = UseMockTransactionReturn & {
    createSpaceTransactionWithRole: Mock
}

export type UseMockCreateChannelReturn = UseMockTransactionReturn & {
    createChannelTransaction: Mock
}

export type UseMockUpdateChannelReturn = UseMockTransactionReturn & {
    updateChannelTransaction: Mock
}

export type UseMockDeleteRoleReturn = UseMockTransactionReturn & {
    deleteRoleTransaction: Mock
}

export type UseMockCreateRoleReturn = UseMockTransactionReturn & {
    createRoleTransaction: Mock
}

export type UseMockUpdateRoleReturn = UseMockTransactionReturn & {
    updateRoleTransaction: Mock
}

type UseMockHookReturn =
    | UseMockCreateSpaceReturn
    | UseMockCreateChannelReturn
    | UseMockUpdateChannelReturn
    | UseMockDeleteRoleReturn
    | UseMockCreateRoleReturn
    | UseMockUpdateRoleReturn

// useCreateSpaceTransaction/useCreateChannelTransaction contains calls to other lib functions whose references aren't replaced by mocking: createSpaceTransaction, waitForCreateSpaceTransaction, etc
// Workarounds:
// 1. Could mock a logged in state - useWithCatch wrapped around createSpaceTransaction is failing b/c not logged in, and ultimately causes test failures
// 2. Could mock the whole hook, which is what the below does. Kind of a hack but works for now
export const mockCreateTransactionWithSpy = (transactionFunctionName: TransactionFnNames) => {
    const createTransactionSpy = vi.fn()

    const useMockedCreateTransaction = (
        outcome:
            | 'success'
            | 'failWithTransaction'
            | 'failedWithMatrixPermissionContext' = 'success',
    ): UseMockHookReturn | undefined => {
        const [transactionContext, setTransactionContext] = useState<
            // TODO: fix this type - likely a generic
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            zionClient.TransactionContext<any> | undefined
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
                    } else if (outcome === 'failedWithMatrixPermissionContext') {
                        setTransactionContext(failedWithMatrixPermissionContext)
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

        switch (transactionFunctionName) {
            case 'createSpaceTransactionWithRole':
                return {
                    ...txData,
                    createSpaceTransactionWithRole: createTransactionMockFn,
                }
            case 'createChannelTransaction':
                return {
                    ...txData,
                    createChannelTransaction: createTransactionMockFn,
                }
            case 'updateChannelTransaction':
                return {
                    ...txData,
                    updateChannelTransaction: createTransactionMockFn,
                }
            case 'deleteRoleTransaction':
                return {
                    ...txData,
                    deleteRoleTransaction: createTransactionMockFn,
                }
            case 'createRoleTransaction':
                return {
                    ...txData,
                    createRoleTransaction: createTransactionMockFn,
                }
            case 'updateRoleTransaction':
                return {
                    ...txData,
                    updateRoleTransaction: createTransactionMockFn,
                }
            default:
                break
        }
    }

    return { useMockedCreateTransaction, createTransactionSpy }
}
