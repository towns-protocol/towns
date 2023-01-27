import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as zionClient from 'use-zion-client'
import { BigNumber } from 'ethers'
import { TestApp } from 'test/testUtils'
import * as useContractRoles from 'hooks/useContractRoles'
import { UseMockCreateChannelReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import * as useRequireTransactionNetwork from 'hooks/useRequireTransactionNetwork'
import { CreateChannelForm } from '.'

const Wrapper = ({
    onCreateChannel = vi.fn(),
    onHide = vi.fn(),
}: {
    onCreateChannel?: () => void
    onHide?: () => void
}) => {
    return (
        <TestApp>
            <CreateChannelForm
                spaceId={{
                    slug: '',
                    protocol: zionClient.SpaceProtocol.Matrix,
                    networkId: '',
                }}
                onCreateChannel={onCreateChannel}
                onHide={onHide}
            />
        </TestApp>
    )
}

type ContractRole = {
    roleId: BigNumber
    name: string
}

const everyoneRole: ContractRole = {
    roleId: BigNumber.from(7),
    name: 'Everyone',
}

const memberRole: ContractRole = {
    roleId: BigNumber.from(8),
    name: 'Member',
}

const { createTransactionSpy: createChannelSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('createChannelTransaction')

const useMockedCreateChannelTransaction = (
    ...args: typeof zionClient.useCreateChannelTransaction['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateChannelReturn

describe('CreateChannelForm', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test('renders checkbox for each role', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'whatever',
            switchNetwork: () => null,
        })

        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                        {
                            ...memberRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)

        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member/i })

        expect(everyoneCheckbox).toHaveAttribute('name', 'roleIds')
        expect(everyoneCheckbox).toHaveAttribute('value', '7')

        expect(everyoneCheckbox).toHaveAttribute('name', 'roleIds')
        expect(memberCheckbox).toHaveAttribute('value', '8')
    })

    test('requires name and role for submission', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'whatever',
            switchNetwork: () => null,
        })
        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)
        const submitButton = screen.getByRole('button', { name: /create/i })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/please enter a channel name/i)).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText(/Please select at least one role/i)).toBeInTheDocument()
        })
    })

    test('cannot perform create channel action if on the wrong network', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: false,
            name: 'whatever',
            switchNetwork: () => null,
        })
        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)
        const submitButton = screen.getByRole('button', { name: /create/i })
        fireEvent.click(submitButton)

        expect(submitButton).toBeDisabled()
        expect(screen.getByText(/switch to/gi)).toBeInTheDocument()
    })

    test('submits with the correct values', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'whatever',

            switchNetwork: () => null,
        })
        vi.spyOn(zionClient, 'useCreateChannelTransaction').mockImplementation(
            useMockedCreateChannelTransaction,
        )

        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                        {
                            ...memberRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByRole('button', { name: /create/i })

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member/i })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(everyoneCheckbox)
        fireEvent.click(memberCheckbox)

        fireEvent.click(submitButton)

        await waitFor(async () => {
            await screen.findByText('Creating channel')
        })

        await waitFor(async () => {
            return expect(createChannelSpy).toHaveBeenCalledWith({
                disableEncryption: false,
                name: 'test-channel',
                parentSpaceId: {
                    networkId: '',
                    protocol: 'matrix',
                    slug: '',
                },
                roleIds: [7, 8],
                visibility: 'public',
            })
        })
    })

    test('shows transaction error message if there was an transaction error', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'whatever',
            switchNetwork: () => null,
        })

        vi.spyOn(zionClient, 'useCreateChannelTransaction').mockImplementation(() =>
            useMockedCreateChannelTransaction('failedWithTransactionContext'),
        )

        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                        {
                            ...memberRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByRole('button', { name: /create/i })

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member/i })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(everyoneCheckbox)
        fireEvent.click(memberCheckbox)

        fireEvent.click(submitButton)

        await waitFor(() => {
            return screen.getByText('Creating channel')
        })

        await screen.findByText('There was an error with the transaction. Please try again')
    })

    test('shows permission error message if there was an error with Matrix permissions', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'whatever',
            switchNetwork: () => null,
        })

        vi.spyOn(zionClient, 'useCreateChannelTransaction').mockImplementation(() =>
            useMockedCreateChannelTransaction('failedWithMatrixPermissionContext'),
        )

        vi.spyOn(useContractRoles, 'useChannelCreationRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                        {
                            ...memberRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useChannelCreationRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByRole('button', { name: /create/i })

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member/i })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(everyoneCheckbox)
        fireEvent.click(memberCheckbox)

        fireEvent.click(submitButton)

        await waitFor(() => {
            return screen.getByText('Creating channel')
        })

        await screen.findByText("You don't have permission to create a channel in this space")
    })
})
