import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as RouterDom from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { RoleDetails } from 'use-towns-client/dist/types/web3-types'
import {
    everyoneRole,
    memberRole,
    mockMemberIds,
    mockMembers,
    roleDataWithBothRolesAssignedToChannel,
    spaceRoomIdentifier,
} from 'test/testMocks'
import { TestApp } from 'test/testUtils'
import {
    UseMockCreateRoleReturn,
    UseMockDeleteRoleReturn,
    UseMockUpdateRoleReturn,
    mockCreateTransactionWithSpy,
} from 'test/transactionHookMock'
import { EVERYONE_ADDRESS } from 'utils'
import { TokenType } from '@components/Tokens/types'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
import { SingleRolePanel } from './SingleRolePanel'
import { SUDOLETS_MOCK } from '../../../mocks/token-collections'

const [roleWithEveryone, roleWithMemberMNft] = roleDataWithBothRolesAssignedToChannel

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

const mockUseSearchParams = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = (await vi.importActual('react-router-dom')) as typeof RouterDom
    return {
        ...actual,
        useSearchParams: () => mockUseSearchParams(),
    }
})

let roleDetailsMockData: RoleDetails | undefined = undefined

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    return {
        ...actual,
        useTownsClient: () => {
            return {
                ...actual.useTownsClient(),
                client: {
                    isEntitled: () => true,
                    getAbstractAccountAddress: () => {
                        return EVERYONE_ADDRESS
                    },
                    isAccountAbstractionEnabled: () => true,
                },
            }
        },
        useRoles: () => {
            return {
                isLoading: false,
                spaceRoles: [everyoneRole, memberRole],
                error: undefined,
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

        useRoleDetails: () => {
            return {
                isLoading: false,
                roleDetails: roleDetailsMockData,
                error: undefined,
            }
        },
        useConnectivity: (): ReturnType<typeof Lib.useConnectivity> => ({
            ...actual.useConnectivity(),
            loggedInWalletAddress: '0x123',
        }),
    }
})

vi.mock('hooks/useSpaceInfoFromPathname', () => {
    return {
        useSpaceIdFromPathname: () => spaceRoomIdentifier,
    }
})

const { createTransactionSpy: createRoleTransactionSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('createRoleTransaction')

const useMockedCreateRoleTransaction = (
    ...args: (typeof Lib.useCreateRoleTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateRoleReturn

const {
    createTransactionSpy: updateRoleTransactionSpy,
    useMockedCreateTransaction: useMockedUpdateTransaction,
} = mockCreateTransactionWithSpy('updateRoleTransaction')

const useMockedUpdateRoleTransaction = (
    ...args: (typeof Lib.useUpdateRoleTransaction)['arguments']
) => useMockedUpdateTransaction(...args) as UseMockUpdateRoleReturn

const {
    createTransactionSpy: deleteRoleTransactionSpy,
    useMockedCreateTransaction: useMockedDeleteTransaction,
} = mockCreateTransactionWithSpy('deleteRoleTransaction')

const useMockedDeleteRoleTransaction = (
    ...args: (typeof Lib.useDeleteRoleTransaction)['arguments']
) => useMockedDeleteTransaction(...args) as UseMockDeleteRoleReturn

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId={spaceRoomIdentifier}>
                <SingleRolePanel />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

const MOCK_USER_ADDRESS = mockMembers[0].userId

afterEach(() => {
    vi.clearAllMocks()
})

describe('SingleRolePanel', () => {
    test('should render empty fields when creating a new role', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const roleName = await getNameInput()
        const gatingSection = await screen.findByTestId('gating-section')
        const membershipTypeEveryone = within(gatingSection).getByTestId('membership-type-everyone')
        const membershipTypeGated = within(gatingSection).getByTestId('membership-type-gated')
        expect(roleName).toHaveValue('')
        expect(membershipTypeEveryone).toBeChecked()
        expect(membershipTypeGated).not.toBeChecked()
    })
    test('should not contain delete role button when creating a new role', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const deleteRoleButton = screen.queryByTestId('delete-role-button')
        expect(deleteRoleButton).not.toBeInTheDocument()
    })

    test('submit button should be disabled when name field is empty', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()
    })

    test('submit button should be disabled when digital assets toggle is enabled but no tokens are selected', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const membershipTypeGated = screen.getByTestId('membership-type-gated')
        await userEvent.click(membershipTypeGated)
        const digitalAssetsToggle = await screen.findByTestId('digital-assets-toggle')
        await userEvent.click(digitalAssetsToggle)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()
    })

    test('submit button should be disabled when wallet addresses toggle is enabled but no wallet addresses are selected', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        await enableWalletAddressesGate()
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()
    })

    test('submit button should be enabled when wallet addresses toggle is enabled and a wallet address is selected', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        await enableWalletAddressesGate()
        const walletAddressInput = screen.getByTestId('pill-selector-input')

        const mockAddress1 = MOCK_USER_ADDRESS
        await userEvent.type(walletAddressInput, mockAddress1)

        await waitFor(() => {
            expect(walletAddressInput).toHaveValue(mockAddress1)
        })

        const addressOption = await screen.findByTestId(`user-pill-selector-option-${mockAddress1}`)
        expect(addressOption).toBeInTheDocument()
        await userEvent.click(addressOption)

        const addressPill = await screen.findByTestId(`user-pill-selector-pill-${mockAddress1}`)
        expect(addressPill).toBeInTheDocument()

        const submitButton = await screen.findByTestId('submit-button')
        expect(submitButton).not.toBeDisabled()
    })

    test('should submit with gated tokens', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(useMockedCreateRoleTransaction)

        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        await userEvent.type(roleName, 'new role 1')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 1/gi).length).toBe(1)
        })

        const option = await addFakeToken()
        await userEvent.click(option)
        await waitFor(() => expect(submitButton).not.toBeDisabled())
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 1',
                [Lib.Permission.React, Lib.Permission.Read],
                // users
                [],
                // ruleData
                createOperationsTreeForERC721(),
                {},
            )
        })
    })

    test('should submit new role with gated users', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(useMockedCreateRoleTransaction)

        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        await userEvent.type(roleName, 'new role 2')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 2/gi).length).toBe(1)
        })

        await addFakeWalletAddress()
        await waitFor(() => expect(submitButton).not.toBeDisabled())
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 2',
                [Lib.Permission.React, Lib.Permission.Read],
                [MOCK_USER_ADDRESS],
                Lib.NoopRuleData,
                {},
            )
        })
    })
    test('should submit new role with gated tokens and users', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(useMockedCreateRoleTransaction)

        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        await userEvent.type(roleName, 'new role 3')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 3/gi).length).toBe(1)
        })

        await enableDigitalAssetsGate()
        const walletAddressesToggle = screen.getByTestId('wallet-addresses-toggle')
        await userEvent.click(walletAddressesToggle)
        expect(walletAddressesToggle).toBeChecked()

        const fakeAddress = MOCK_USER_ADDRESS
        const walletAddressInput = screen.getByTestId(/pill-selector-input/i)
        await userEvent.type(walletAddressInput, fakeAddress)
        await waitFor(() => {
            expect(walletAddressInput).toHaveValue(fakeAddress)
        })
        const addressOption = await screen.findByTestId(`user-pill-selector-option-${fakeAddress}`)
        expect(addressOption).toBeInTheDocument()
        await userEvent.click(addressOption)

        const addressPill = screen.getByTestId(`user-pill-selector-pill-${fakeAddress}`)
        expect(addressPill).toBeInTheDocument()
        await userEvent.click(addressPill)

        const tokenSearch = screen.getByTestId('token-search')
        const tokenInput = await within(tokenSearch).findByTestId(/token-selector-input/i)
        await userEvent.click(tokenInput)
        // erc1155 ui not set up yet, this is an ERC721 token
        await userEvent.type(tokenInput, SUDOLETS_MOCK.address)
        const tokenOption = await waitFor(() => {
            return within(tokenSearch).getAllByTestId(/^token-selector-option/i)
        })
        await userEvent.click(tokenOption[0])

        await waitFor(() => expect(submitButton).not.toBeDisabled())
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 3',
                [Lib.Permission.React, Lib.Permission.Read],
                [MOCK_USER_ADDRESS],
                createOperationsTreeForERC721(),
                {},
            )
        })
    })
    test('should submit new role with checked permissions', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(useMockedCreateRoleTransaction)

        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        await userEvent.type(roleName, 'new role 4')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 4/gi).length).toBe(1)
        })

        await addFakeWalletAddress()

        const channelPermissions = screen.getByTestId('channel-permissions')
        const permissionsCheckboxes = within(channelPermissions).getAllByTestId('toggle')

        // click the write checkbox
        await userEvent.click(permissionsCheckboxes[1])

        await waitFor(() => expect(submitButton).not.toBeDisabled())
        await userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 4',
                [Lib.Permission.React, Lib.Permission.Read, Lib.Permission.Write],
                [MOCK_USER_ADDRESS],
                Lib.NoopRuleData,
                {},
            )
        })
    })

    test('should render with default values when editing a role with everyone access', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        roleDetailsMockData = roleWithEveryone
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Everyone'))

        const membershipTypeEveryone = screen.getByTestId('membership-type-everyone')
        expect(membershipTypeEveryone).toBeChecked()
        const membershipTypeGated = screen.getByTestId('membership-type-gated')
        expect(membershipTypeGated).not.toBeChecked()
    })

    test('should render with default values when editing a role - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const digitalAssetsToggle = await screen.findByTestId('digital-assets-toggle')
        expect(digitalAssetsToggle).toBeChecked()
        const walletAddressesToggle = screen.getByTestId('wallet-addresses-toggle')
        expect(walletAddressesToggle).not.toBeChecked()
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
    })

    test('should show error when only gated asset is removed - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        await Promise.all(deletePillButtons.map(async (button) => await userEvent.click(button)))

        await waitFor(() =>
            expect(
                within(tokenSearch).queryAllByTestId(/^token-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token/gi)
    })

    test('should not show error when only gated asset is removed then added - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        await Promise.all(deletePillButtons.map(async (button) => await userEvent.click(button)))

        await waitFor(() =>
            expect(
                within(tokenSearch).queryAllByTestId(/^token-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token/gi)
        const option = await addFakeToken()
        await userEvent.click(option)
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                1,
            ),
        )
        expect(screen.queryByText(/Select at least one token/gi)).toBeNull()
    })

    test('should enable submit button when name is changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()
        await userEvent.type(roleName, 'new name')
        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())
    })

    test('should enable submit button when permissions are changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await screen.findByPlaceholderText(/Enter a name for the role/gi)
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()
        const writeCheckbox = screen.getByRole('checkbox', { name: /send messages/i })
        expect(writeCheckbox).toBeInTheDocument()
        await userEvent.click(writeCheckbox)
        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())
    })

    test('should enable submit button when tokens are changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()

        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        await userEvent.click(deletePillButtons[0])

        const tokenPillsAfter = await within(tokenSearch).findAllByTestId(
            /^token-pill-selector-pill/i,
        )
        await waitFor(() => {
            expect(tokenPillsAfter).toHaveLength(1)
        })
        await waitFor(() => {
            expect(screen.getByTestId('submit-button')).not.toBeDisabled()
        })
    })

    test('should submit updated role with gated tokens and users', async () => {
        vi.spyOn(Lib, 'useUpdateRoleTransaction').mockImplementation(useMockedUpdateRoleTransaction)

        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = await screen.findByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()

        await userEvent.type(roleName, 'new name')

        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())

        await userEvent.click(screen.getByTestId('submit-button'))

        await waitFor(() => {
            expect(updateRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                roleWithMemberMNft.id,
                roleWithMemberMNft.name + 'new name',
                [Lib.Permission.React, Lib.Permission.Read, Lib.Permission.Write],
                [],
                roleWithMemberMNft.ruleData.rules,
                {},
            )
        })
    })

    test('should have React permission toggled on load, if the role contains Write permission (cover legacy, pre React permission roles)', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = {
            id: 8,
            name: 'Member',
            permissions: [Lib.Permission.Read, Lib.Permission.Write],
            users: [],
            channels: [],
            ruleData: {
                kind: 'v2',
                rules: Lib.createOperationsTree([]),
            },
        }
        render(<Wrapper />)
        const roleName = await screen.findByPlaceholderText(/Enter a name for the role/gi)
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const writeCheckbox = screen.getByRole('checkbox', { name: /send messages/i })
        const reactCheckbox = screen.getByRole('checkbox', { name: /react/i })
        expect(writeCheckbox).toBeChecked()
        expect(reactCheckbox).toBeChecked()
        expect(reactCheckbox).toBeDisabled()
    })

    test('should not have React permission toggled on load, if the role does not contain Write permission (cover legacy, pre React permission roles)', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = {
            id: 8,
            name: 'Member',
            permissions: [Lib.Permission.Read],
            users: [],
            channels: [],
            ruleData: {
                kind: 'v2',
                rules: Lib.createOperationsTree([]),
            },
        }
        render(<Wrapper />)
        const roleName = await screen.findByPlaceholderText(/Enter a name for the role/gi)
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const writeCheckbox = screen.getByRole('checkbox', { name: /send messages/i })
        const reactCheckbox = screen.getByRole('checkbox', { name: /react/i })
        expect(writeCheckbox).not.toBeChecked()
        expect(reactCheckbox).not.toBeChecked()
        expect(reactCheckbox).toBeEnabled()
    })

    test('should toggle React permission on if Write permission is toggled', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = {
            id: 8,
            name: 'Member',
            permissions: [Lib.Permission.Read],
            users: [],
            channels: [],
            ruleData: {
                kind: 'v2',
                rules: Lib.createOperationsTree([]),
            },
        }
        render(<Wrapper />)
        const roleName = await screen.findByPlaceholderText(/Enter a name for the role/gi)
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const writeCheckbox = screen.getByRole('checkbox', { name: /send messages/i })
        const reactCheckbox = screen.getByRole('checkbox', { name: /react/i })
        expect(writeCheckbox).not.toBeChecked()
        expect(reactCheckbox).not.toBeChecked()
        expect(reactCheckbox).toBeEnabled()
        await userEvent.click(writeCheckbox)
        expect(writeCheckbox).toBeChecked()
        expect(reactCheckbox).toBeChecked()
        expect(reactCheckbox).toBeDisabled()
    })

    test('should not toggle React permission if Write permission is toggled off', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = {
            id: 8,
            name: 'Member',
            permissions: [Lib.Permission.Read],
            users: [],
            channels: [],
            ruleData: {
                kind: 'v2',
                rules: Lib.createOperationsTree([]),
            },
        }
        render(<Wrapper />)
        const roleName = await screen.findByPlaceholderText(/Enter a name for the role/gi)
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const writeCheckbox = screen.getByRole('checkbox', { name: /send messages/i })
        const reactCheckbox = screen.getByRole('checkbox', { name: /react/i })
        expect(writeCheckbox).not.toBeChecked()
        expect(reactCheckbox).not.toBeChecked()

        await userEvent.click(writeCheckbox)
        expect(writeCheckbox).toBeChecked()
        expect(reactCheckbox).toBeChecked()
        expect(reactCheckbox).toBeDisabled()

        await userEvent.click(writeCheckbox)
        expect(writeCheckbox).not.toBeChecked()
        expect(reactCheckbox).toBeChecked()
        expect(reactCheckbox).not.toBeDisabled()

        await userEvent.click(reactCheckbox)
        expect(reactCheckbox).not.toBeChecked()
        expect(reactCheckbox).not.toBeDisabled()
        expect(writeCheckbox).not.toBeChecked()
    })

    test('should contain delete role button when editing a role', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        render(<Wrapper />)
        const deleteRoleButton = screen.queryByTestId('delete-role-button')
        expect(deleteRoleButton).toBeInTheDocument()
    })

    test('should delete role', async () => {
        vi.spyOn(Lib, 'useDeleteRoleTransaction').mockImplementation(useMockedDeleteRoleTransaction)

        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        render(<Wrapper />)
        const deleteRoleButton = screen.getByTestId('delete-role-button')
        await userEvent.click(deleteRoleButton)
        const confirmButton = await screen.findByTestId('confirm-delete-role-button')
        await userEvent.click(confirmButton)

        await waitFor(() => {
            expect(deleteRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                roleWithEveryone.id,
                {},
            )
        })
    })
})

async function enableGatingOption() {
    const membershipTypeGated = screen.getByTestId('membership-type-gated')
    expect(membershipTypeGated).toBeInTheDocument()
    await userEvent.click(membershipTypeGated)

    const digitalAssetsToggle = await screen.findByTestId('digital-assets-toggle')
    expect(digitalAssetsToggle).toBeInTheDocument()

    const walletAddressesToggle = screen.getByTestId('wallet-addresses-toggle')
    expect(walletAddressesToggle).toBeInTheDocument()
}

async function enableDigitalAssetsGate() {
    await enableGatingOption()

    const digitalAssetsToggle = await screen.findByTestId('digital-assets-toggle')
    if (!(await waitFor(() => (digitalAssetsToggle as HTMLInputElement).checked))) {
        await userEvent.click(digitalAssetsToggle)
    }
    await waitFor(() => expect(digitalAssetsToggle).toBeChecked())
}

async function enableWalletAddressesGate() {
    await enableGatingOption()

    const walletAddressesToggle = await screen.findByTestId('wallet-addresses-toggle')
    if (!(await waitFor(() => (walletAddressesToggle as HTMLInputElement).checked))) {
        await userEvent.click(walletAddressesToggle)
    }
    await waitFor(() => expect(walletAddressesToggle).toBeChecked())
}

async function addFakeToken() {
    await enableDigitalAssetsGate()

    const tokenSearch = await screen.findByTestId('token-search')
    const tokenInput = await within(tokenSearch).findByTestId(/token-selector-input/i)
    await userEvent.click(tokenInput)
    // erc1155 ui not set up yet, this is an ERC721 token
    await userEvent.type(tokenInput, SUDOLETS_MOCK.address)
    const option = await waitFor(() => {
        return within(tokenSearch).getAllByTestId(/^token-selector-option/i)
    })
    return option[0]
}

async function openWalletAddressesSearch() {
    await enableWalletAddressesGate()

    const userSearch = await screen.findByTestId('user-search')
    const userInput = within(userSearch).getByTestId(/pill-selector-input/i)
    await userEvent.click(userInput)
}

async function addFakeWalletAddress() {
    await openWalletAddressesSearch()
    const fakeAddress = MOCK_USER_ADDRESS
    const walletAddressInput = await screen.findByTestId(/pill-selector-input/i)
    await userEvent.type(walletAddressInput, fakeAddress)
    await waitFor(() => {
        expect(walletAddressInput).toHaveValue(fakeAddress)
    })
    const addressOption = await screen.findByTestId(`user-pill-selector-option-${fakeAddress}`)
    expect(addressOption).toBeInTheDocument()
    await userEvent.click(addressOption)

    const addressPill = screen.getByTestId(`user-pill-selector-pill-${fakeAddress}`)
    expect(addressPill).toBeInTheDocument()
    await userEvent.click(addressPill)
}

function getNameInput() {
    return screen.findByPlaceholderText(/Enter a name for the role/gi)
}

function createOperationsTreeForERC721() {
    return Lib.createOperationsTree([
        {
            address: SUDOLETS_MOCK.address as Lib.Address,
            chainId: BigInt(1),
            type: convertTokenTypeToOperationType(TokenType.ERC721),
        },
    ])
}
