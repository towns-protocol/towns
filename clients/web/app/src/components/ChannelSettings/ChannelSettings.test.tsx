import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as zionClient from 'use-zion-client'
import { BigNumber } from 'ethers'
import { TestApp } from 'test/testUtils'
import * as useContractRoles from 'hooks/useContractRoles'
import { UseMockUpdateChannelReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import * as useRequireTransactionNetwork from 'hooks/useRequireTransactionNetwork'
import { ChannelSettingsForm } from './ChannelSettingsModal'
import { MOCK_CONTRACT_METADATA_ADDRESSES } from '../../../mocks/token-collections'

const CHANNEL_ID = 'channel1'
const SPACE_ID = 'town1'
const spaceRoomIdentifier = {
    slug: SPACE_ID,
    protocol: zionClient.SpaceProtocol.Matrix,
    networkId: SPACE_ID,
}

const channelRoomIdentifier = {
    slug: CHANNEL_ID,
    protocol: zionClient.SpaceProtocol.Matrix,
    networkId: CHANNEL_ID,
}

const Wrapper = ({
    onHide = vi.fn(),
    onUpdatedChannel = vi.fn(),
}: {
    onUpdatedChannel?: () => void
    onHide?: () => void
}) => {
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
                        onHide={onHide}
                        onUpdatedChannel={onUpdatedChannel}
                    />
                )}
            </>
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

const { createTransactionSpy: updateChannelTransactionSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('updateChannelTransaction')

const useMockedUpdateChannelTransaction = (
    ...args: (typeof zionClient.useCreateChannelTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockUpdateChannelReturn

const channelDataForRole: {
    name: string
    channelNetworkId: string
    disabled: boolean
} = {
    name: 'Channel 1',
    channelNetworkId: channelRoomIdentifier.networkId,
    disabled: false,
}

const roleDataWithBothRolesAssignedToChannel = [
    {
        id: 7,
        name: 'Everyone',
        permissions: ['Read', 'Write'],
        tokens: [],
        users: ['0x1'],
        channels: [channelDataForRole],
    },
    {
        id: 8,
        name: 'Member',
        permissions: ['Read', 'Write'],
        tokens: [
            {
                contractAddress: MOCK_CONTRACT_METADATA_ADDRESSES[0],
            },
            {
                contractAddress: MOCK_CONTRACT_METADATA_ADDRESSES[1],
            },
        ],
        users: [],
        channels: [channelDataForRole],
    },
]

const roleDataWithMemberAssignedToChannel = [
    {
        ...roleDataWithBothRolesAssignedToChannel[0],
        channels: [],
    },
    {
        ...roleDataWithBothRolesAssignedToChannel[1],
        channels: [channelDataForRole],
    },
]

let mockDataForUseMultipleRoleDetails = roleDataWithBothRolesAssignedToChannel

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof zionClient
    return {
        ...actual,
        useRoom: () => {
            return {
                id: channelRoomIdentifier,
                name: 'some channel',
                membership: 'join',
                members: [],
                membersMap: {},
                topic: 'channel topic',
            }
        },
        useMultipleRoleDetails: () => {
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
    })

    test('renders correct prefilled values', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        vi.spyOn(useContractRoles, 'useSpaceRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useSpaceRoles>
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
    })

    test('submits correct values', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        vi.spyOn(zionClient, 'useUpdateChannelTransaction').mockImplementation(
            useMockedUpdateChannelTransaction,
        )

        vi.spyOn(useContractRoles, 'useSpaceRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useSpaceRoles>
            },
        )

        render(<Wrapper />)

        const memberCheckbox = await screen.findByRole('checkbox', { name: /member/i })
        const submitButton = screen.getByRole('button', { name: /save on chain/i })

        // remove member role
        memberCheckbox.click()

        fireEvent.click(submitButton)

        await waitFor(async () => {
            await screen.findByText('Updating channel')
        })

        await waitFor(async () => {
            return expect(updateChannelTransactionSpy).toHaveBeenCalledWith({
                channelId: channelRoomIdentifier,
                parentSpaceId: spaceRoomIdentifier,
                updatedChannelName: 'some channel',
                updatedChannelTopic: 'channel topic',
                updatedRoleIds: [7],
            })
        })
    })

    test('when role details change on load, correct roles are checked and submitted', async () => {
        vi.spyOn(useRequireTransactionNetwork, 'useRequireTransactionNetwork').mockReturnValue({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        })

        vi.spyOn(zionClient, 'useUpdateChannelTransaction').mockImplementation(
            useMockedUpdateChannelTransaction,
        )

        vi.spyOn(useContractRoles, 'useSpaceRoles').mockImplementation(
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
                } as unknown as ReturnType<typeof useContractRoles.useSpaceRoles>
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
            await screen.findByText('Updating channel')
        })

        await waitFor(async () => {
            return expect(updateChannelTransactionSpy).toHaveBeenCalledWith({
                channelId: channelRoomIdentifier,
                parentSpaceId: spaceRoomIdentifier,
                updatedChannelName: 'some channel',
                updatedChannelTopic: 'channel topic',
                updatedRoleIds: [8],
            })
        })
    })
})
