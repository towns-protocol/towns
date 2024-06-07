import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as townsClient from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import * as useContractRoles from 'hooks/useContractRoles'
import { UseMockUpdateChannelReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import {
    everyoneRole,
    memberRole,
    roleDataWithBothRolesAssignedToChannel,
    roleDataWithMemberAssignedToChannel,
} from 'test/testMocks'
import { ChannelSettingsForm } from './ChannelSettings'

const CHANNEL_ID = 'channel1'
const SPACE_ID = 'town1'
const spaceRoomIdentifier = SPACE_ID

const channelRoomIdentifier = CHANNEL_ID

const Wrapper = () => {
    const [showForm, setShowForm] = React.useState(true)

    return (
        <TestApp>
            <>
                <button onClick={() => setShowForm((state) => !state)}>Show form</button>
                {showForm && (
                    <ChannelSettingsForm
                        spaceId={spaceRoomIdentifier}
                        channelId={channelRoomIdentifier}
                        preventCloseMessage="Dummy close message"
                    />
                )}
            </>
        </TestApp>
    )
}

const { createTransactionSpy: updateChannelTransactionSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('updateChannelTransaction')

const useMockedUpdateChannelTransaction = (
    ...args: (typeof townsClient.useCreateChannelTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockUpdateChannelReturn

let mockDataForUseMultipleRoleDetails = roleDataWithBothRolesAssignedToChannel

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
        useRoom: () => {
            return {
                id: channelRoomIdentifier,
                name: 'some channel',
                membership: 'join',
                members: [],
                topic: 'channel topic',
                isDefault: false,
            }
        },
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

// TODO: flaky in CI
// https://linear.app/hnt-labs/issue/HNT-5116/investigate-flaky-test
describe.skip('CreateChannelForm', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test.skip(
        'renders correct prefilled values',
        async () => {
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

            const everyoneCheckbox = await screen.findByRole('checkbox', { name: /everyone/i })
            const memberCheckbox = await screen.findByRole('checkbox', { name: /member/i })

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

            await waitFor(() => {
                expect(screen.getByDisplayValue(/some channel/gi)).toBeInTheDocument()
            })

            await waitFor(() => {
                expect(screen.getByDisplayValue(/channel topic/gi)).toBeInTheDocument()
            })

            await waitFor(() => {
                expect(memberCheckbox).toBeChecked()
            })

            await waitFor(() => {
                expect(everyoneCheckbox).toBeChecked()
            })
        },
        {
            timeout: 20_000,
        },
    )

    test('submits correct values', async () => {
        vi.spyOn(townsClient, 'useUpdateChannelTransaction').mockImplementation(
            useMockedUpdateChannelTransaction,
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

        const memberCheckbox = await screen.findByRole('checkbox', { name: /member/i })
        const submitButton = screen.getByRole('button', { name: /save on chain/i })

        // remove member role
        memberCheckbox.click()

        fireEvent.click(submitButton)

        await waitFor(async () => {
            await screen.findByText('Channel updated')
        })

        await waitFor(async () => {
            return expect(updateChannelTransactionSpy).toHaveBeenCalledWith(
                {
                    channelId: channelRoomIdentifier,
                    parentSpaceId: spaceRoomIdentifier,
                    updatedChannelName: 'some channel',
                    updatedChannelTopic: 'channel topic',
                    updatedRoleIds: [7],
                    isDefault: false,
                },
                {},
            )
        })
    })

    test(
        'when role details change on load, correct roles are checked and submitted',
        async () => {
            vi.spyOn(townsClient, 'useUpdateChannelTransaction').mockImplementation(
                useMockedUpdateChannelTransaction,
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

            // first render with both roles assigned to channel
            const { rerender } = render(<Wrapper />)

            const everyoneCheckbox = await screen.findByRole('checkbox', { name: /everyone/i })
            const memberCheckbox = await screen.findByRole('checkbox', { name: /member/i })
            const submitButton = screen.getByRole('button', { name: /save on chain/i })

            await waitFor(() => {
                expect(memberCheckbox).toBeChecked()
            })

            await waitFor(() => {
                expect(everyoneCheckbox).toBeChecked()
            })

            // fake bg data update
            mockDataForUseMultipleRoleDetails = roleDataWithMemberAssignedToChannel

            rerender(<Wrapper />)

            await waitFor(() => {
                expect(memberCheckbox).toBeChecked()
            })

            await waitFor(() => {
                expect(everyoneCheckbox).not.toBeChecked()
            })

            fireEvent.click(submitButton)

            await waitFor(async () => {
                await screen.findByText('Channel updated')
            })

            await waitFor(async () => {
                return expect(updateChannelTransactionSpy).toHaveBeenCalledWith(
                    {
                        channelId: channelRoomIdentifier,
                        parentSpaceId: spaceRoomIdentifier,
                        updatedChannelName: 'some channel',
                        updatedChannelTopic: 'channel topic',
                        updatedRoleIds: [8],
                        isDefault: false,
                    },
                    {},
                )
            })
        },
        { timeout: 20_000 },
    )
})
