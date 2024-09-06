import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as townsClient from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import * as useContractRoles from 'hooks/useContractRoles'
import { UseMockCreateChannelReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import { everyoneRole, memberRole, roleDataWithBothRolesAssignedToChannel } from 'test/testMocks'
import * as useSpaceChannels from 'hooks/useSpaceChannels'
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
            <CreateChannelForm spaceId="" onCreateChannel={onCreateChannel} onHide={onHide} />
        </TestApp>
    )
}

const { createTransactionSpy: createChannelSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('createChannelTransaction')

const useMockedCreateChannelTransaction = (
    ...args: (typeof townsClient.useCreateChannelTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateChannelReturn

const mockDataForUseMultipleRoleDetails = roleDataWithBothRolesAssignedToChannel

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
    }
})

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
    }
})

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof townsClient
    return {
        ...actual,
        useMultipleRoleDetails: (): {
            data: townsClient.RoleDetails[]
            invalidateQuery: () => void
        } => {
            return {
                data: mockDataForUseMultipleRoleDetails,
                invalidateQuery: () => null,
            }
        },
    }
})

describe('CreateChannelForm', () => {
    beforeEach(() => {
        vi.resetAllMocks()

        vi.mock('ui/styles/atoms.css', () => ({
            atoms: Object.assign(() => {}, {
                properties: new Set([]),
            }),
            boxClass: '',
            containerWithGapClass: '',
        }))

        vi.mock('framer-motion', async () => {
            return {
                AnimatePresence: ({ children }: { children: JSX.Element }) => children,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                motion: (c: any) => c,
            }
        })
    })

    afterAll(() => {
        vi.resetAllMocks()
    })

    test.skip('renders checkbox for each role', async () => {
        /*
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isReady: true,
            isTransactionNetwork: true,
            name: 'Sepolia',
            switchNetwork: () => null,
        })
        */

        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        render(<Wrapper />)

        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member(?!s)/i })

        expect(everyoneCheckbox).toHaveAttribute('name', 'roleIds')
        expect(everyoneCheckbox).toHaveAttribute('value', '7')

        expect(everyoneCheckbox).toHaveAttribute('name', 'roleIds')
        expect(memberCheckbox).toHaveAttribute('value', '8')

        await waitFor(() => {
            expect(screen.getByText(/sudolets/gi)).toBeInTheDocument()
        })
        await waitFor(() => {
            expect(screen.getByText(/Daisen.fi Investor Pass/gi)).toBeInTheDocument()
        })
    })

    test('requires name and role for submission', async () => {
        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
            (_spaceNetworkId: string | undefined) => {
                return {
                    data: [
                        {
                            ...everyoneRole,
                        },
                    ],
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        vi.spyOn(useSpaceChannels, 'useSpaceChannels').mockImplementation(() => {
            return [{ id: '1', name: 'test-channel', label: 'test-channel' }]
        })

        render(<Wrapper />)
        const submitButton = screen.getByText(/create channel/i)
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(
                screen.getByText(/Channel names must have at least 2 characters/i),
            ).toBeInTheDocument()
        })

        // Uncheck the automatically preselected checkbox
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        fireEvent.click(everyoneCheckbox)

        await waitFor(() => {
            expect(screen.getByText(/Please select at least one role/i)).toBeInTheDocument()
        })

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        fireEvent.change(nameInput, { target: { value: 'test-channel' } })

        await waitFor(() => {
            expect(screen.getByText(/This channel name is already taken/i)).toBeInTheDocument()
        })
    })

    test('the `Everyone` role is preselected', async () => {
        vi.spyOn(townsClient, 'useCreateChannelTransaction').mockImplementation(
            useMockedCreateChannelTransaction,
        )

        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        render(<Wrapper />)

        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        expect(everyoneCheckbox).toBeChecked()
    })

    test('submits with the correct values', async () => {
        vi.spyOn(townsClient, 'useCreateChannelTransaction').mockImplementation(
            useMockedCreateChannelTransaction,
        )

        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByText(/create channel/i)

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member(?!s)/i })
        const autojoinCheckbox = screen.getByRole('checkbox', { name: /auto-join new members/i })
        const hideUserJoinLeaveEventsCheckbox = screen.getByRole('checkbox', {
            name: /hide join and leave/i,
        })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(memberCheckbox)
        fireEvent.click(autojoinCheckbox)
        fireEvent.click(hideUserJoinLeaveEventsCheckbox)

        fireEvent.click(submitButton)

        await waitFor(async () => {
            return expect(createChannelSpy).toHaveBeenCalledWith(
                {
                    name: 'test-channel',
                    parentSpaceId: '',
                    topic: '',
                    roles: [7, 8].map((roleId) => ({ roleId, permissions: [] })),
                    channelSettings: {
                        autojoin: true,
                        hideUserJoinLeaveEvents: true,
                    },
                },
                {},
            )
        })
    })

    test('shows transaction error message if there was an transaction error', async () => {
        vi.spyOn(townsClient, 'useCreateChannelTransaction').mockImplementation(() =>
            useMockedCreateChannelTransaction('failedWithTransactionContext'),
        )

        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByText(/create channel/i)

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member(?!s)/i })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(everyoneCheckbox)
        fireEvent.click(memberCheckbox)

        fireEvent.click(submitButton)

        await waitFor(() => {
            return screen.getByText('Create Channel')
        })

        await screen.findByText('There was an error with the transaction. Please try again')
    })

    test('shows permission error message if there was an error with permissions', async () => {
        vi.spyOn(townsClient, 'useCreateChannelTransaction').mockImplementation(() =>
            useMockedCreateChannelTransaction('failedWithPermissionContext'),
        )

        vi.spyOn(useContractRoles, 'useContractRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useContractRoles>
            },
        )

        render(<Wrapper />)

        const submitButton = screen.getByText(/create channel/i)

        const nameInput = screen.getByRole('textbox', { name: /name/i })
        const everyoneCheckbox = screen.getByRole('checkbox', { name: /everyone/i })
        const memberCheckbox = screen.getByRole('checkbox', { name: /member(?!s)/i })

        fireEvent.change(nameInput, { target: { value: 'test channel' } })
        fireEvent.click(everyoneCheckbox)
        fireEvent.click(memberCheckbox)

        fireEvent.click(submitButton)

        await waitFor(() => {
            return screen.getByText('Create Channel')
        })

        await screen.findByText("You don't have permission to create a channel in this town")
    })
})
