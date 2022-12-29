import React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TransactionEvents } from 'TransactionEvents'
import { TestApp } from 'test/testUtils'
import { StoredTransactionType, useTransactionStore } from 'store/transactionsStore'
import { Button } from '@ui'

const waitSpy = vi.fn()

const web3ContextMock = {
    sign: async () => undefined,
    accounts: ['0x1234'],
    chains: [],
    isConnected: true,
    provider: {
        getTransaction: () => {
            return {
                wait: waitSpy,
            }
        },
    },
    walletStatus: 'connected',
}

vi.mock('use-zion-client', async () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((await vi.importActual('use-zion-client')) as any),
        useWeb3Context: () => web3ContextMock,
        useMatrixCredentials: () => ({
            isAuthenticated: true,
        }),
    }
})

const Mock = () => {
    const storeTransaction = useTransactionStore((state) => state.storeTransaction)

    function onClick() {
        storeTransaction({
            hash: '0x1234',
            data: 'room-slug',
            type: StoredTransactionType.CreateSpace,
        })
    }

    return (
        <TestApp>
            <>
                <TransactionEvents />
                <Button onClick={onClick}>Click</Button>
            </>
        </TestApp>
    )
}

describe('transactionStore', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('deletes added entry on receipt', async () => {
        waitSpy.mockResolvedValueOnce({
            status: 1,
        })

        render(<Mock />)
        const button = screen.getByRole('button', { name: 'Click' })
        fireEvent.click(button)
        expect(useTransactionStore.getState().transactions['0x1234']?.data).toBe('room-slug')
        await waitFor(() => {
            expect(useTransactionStore.getState().transactions['0x1234']).toBeUndefined()
        })
    })

    test('deletes added entry on transaction error', async () => {
        waitSpy.mockImplementationOnce(() => {
            throw new Error('Transaction error')
        })

        render(<Mock />)
        const button = screen.getByRole('button', { name: 'Click' })
        fireEvent.click(button)
        expect(useTransactionStore.getState().transactions['0x1234']?.data).toBe('room-slug')
        await waitFor(() => {
            expect(useTransactionStore.getState().transactions['0x1234']).toBeUndefined()
        })
    })
})
