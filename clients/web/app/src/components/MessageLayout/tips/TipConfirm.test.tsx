import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { LookupUser } from 'use-towns-client'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { TestApp } from 'test/testUtils'
import {
    channelRoomIdentifier,
    mockMemberIds,
    mockMembers,
    spaceRoomIdentifier,
} from 'test/testMocks'
import { UseMockTipReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import { TipConfirm } from './TipConfirm'
import type { TipOption } from './types'

vi.mock('privy/useCombinedAuth', async () => {
    const actual = (await vi.importActual(
        'privy/useCombinedAuth',
    )) as typeof import('privy/useCombinedAuth')

    return {
        ...actual,
        useCombinedAuth: () => ({
            register: () => Promise.resolve(),
            loggedInWalletAddress: '0x1234',
            isConnected: true,
        }),
    }
})

vi.mock('../Web3/fetchEthPrice', async () => {
    const actual = await vi.importActual<typeof import('../../Web3/fetchEthPrice')>(
        '../../Web3/fetchEthPrice',
    )
    return {
        ...actual,
        fetchEthPrice: vi.fn().mockResolvedValue('3288.825276856'),
    }
})

vi.mock('hooks/useSpaceInfoFromPathname', () => {
    return {
        useSpaceIdFromPathname: () => spaceRoomIdentifier,
    }
})

vi.mock('hooks/useChannelIdFromPathname', () => {
    return {
        useChannelIdFromPathname: () => channelRoomIdentifier,
    }
})

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    const mocked = {
        getAbstractAccountAddress: () => Lib.MOCK_ADDRESS,
        isAccountAbstractionEnabled: () => true,
        isEntitled: () => true,
        spaceDapp: {
            getTokenIdOfOwner: () => '1',
        },
    }
    return {
        ...actual,
        useTownsContext: () => {
            return {
                ...actual.useTownsContext(),
                clientSingleton: {
                    baseTransactor: {
                        userOps: {
                            getAbstractAccountAddress: () => Lib.MOCK_ADDRESS,
                        },
                    },
                },
            }
        },
        useTownsClient: () => {
            return {
                ...actual.useTownsClient(),
                client: {
                    ...mocked,
                },
                clientSingleton: {
                    ...mocked,
                },
            }
        },

        useChannelData: () => {
            return {
                channelId: channelRoomIdentifier,
            }
        },
        useUserLookupContext: () => {
            return {
                lookupUser: (userId: string) => mockMembers.find((m) => m.userId === userId),
            }
        },
        useSpaceMembers: () => {
            return {
                memberIds: mockMemberIds,
            }
        },
        useConnectivity: (): ReturnType<typeof Lib.useConnectivity> => ({
            ...actual.useConnectivity(),
            loggedInWalletAddress: '0x123',
        }),
        useTokenIdOfOwner: () => ({
            data: '1',
            isLoading: false,
            isError: false,
        }),
    }
})

const mockTipOption: TipOption = {
    amountInCents: 100,
    label: '$1',
}

const mockMessageOwner: LookupUser = {
    userId: '0x789',
    displayName: 'Test User',
    username: 'testuser',
    usernameConfirmed: true,
    usernameEncrypted: true,
    displayNameEncrypted: true,
}

const onTip = vi.fn()
const onInsufficientBalance = vi.fn()

const eventId = '20212223'

const TestTipConfirm = () => {
    return (
        <TestApp>
            <TipConfirm
                tipValue={mockTipOption}
                setTipValue={() => {}}
                messageOwner={mockMessageOwner}
                eventId={eventId}
                onTip={onTip}
                onInsufficientBalance={onInsufficientBalance}
            />
        </TestApp>
    )
}

const { createTransactionSpy: tipTransactionSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('tipTransaction')

const useMockedTipTransaction = (...args: (typeof Lib.useTipTransaction)['arguments']) =>
    useMockedCreateTransaction(...args) as UseMockTipReturn

describe('TipConfirm', () => {
    it('should render tip confirmation screen', async () => {
        render(<TestTipConfirm />)

        await waitFor(() => {
            expect(screen.getByText('Confirm Tip')).toBeInTheDocument()
        })
        expect(screen.getByText('$1', { exact: false })).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Send')).toBeInTheDocument()
    })

    it('should call onTip when confirm is clicked', async () => {
        vi.spyOn(Lib, 'useTipTransaction').mockImplementation(useMockedTipTransaction)

        render(<TestTipConfirm />)

        await waitFor(() => {
            expect(screen.getByText('Confirm Tip')).toBeInTheDocument()
        })

        const sendButton = screen.getByText('Send')
        await userEvent.click(sendButton)

        expect(onTip).toHaveBeenCalled()

        await waitFor(() => {
            expect(tipTransactionSpy).toHaveBeenCalledWith(
                {
                    amount: 304059935028219n,
                    currency: Lib.ETH_ADDRESS,
                    messageId: eventId,
                    spaceId: spaceRoomIdentifier,
                    channelId: channelRoomIdentifier,
                    receiverUserId: mockMessageOwner.userId,
                    receiverTokenId: '1',
                    receiverUsername: mockMessageOwner.username,
                    receiverAddress: Lib.MOCK_ADDRESS,
                    senderAddress: Lib.MOCK_ADDRESS,
                    signer: {},
                },
                {
                    onSuccess: expect.any(Function),
                },
            )
        })
    })
})
