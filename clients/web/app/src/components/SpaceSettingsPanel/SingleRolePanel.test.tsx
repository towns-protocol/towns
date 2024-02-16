import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import * as RouterDom from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { RoleDetails } from 'use-zion-client/dist/types/web3-types'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import {
    everyoneRole,
    memberRole,
    mockMemberIds,
    mockMembers,
    mockUsersMap,
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
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { SingleRolePanel } from './SingleRolePanel'

const [roleWithEveryone, roleWithMemberMNft] = roleDataWithBothRolesAssignedToChannel

vi.mock('hooks/useAuth', async () => {
    const actual = (await vi.importActual('hooks/useAuth')) as typeof import('hooks/useAuth')

    return {
        ...actual,
        useAuth: () => ({
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

const mockCollectionsForOwner: ReturnType<typeof useCollectionsForOwner>['data'] = {
    tokens: [
        {
            contractAddress: '0x134',
            label: 'Test token',
            imgSrc: 'test.png',
        },
    ],
    nextPageKey: undefined,
}

vi.mock('api/lib/tokenContracts', async () => {
    const actual = (await vi.importActual(
        'api/lib/tokenContracts',
    )) as typeof import('api/lib/tokenContracts')
    return {
        ...actual,
        useCollectionsForOwner: () => {
            return {
                data: mockCollectionsForOwner,
                isLoading: false,
            }
        },
    }
})

let roleDetailsMockData: RoleDetails | undefined = undefined

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof Lib
    return {
        ...actual,
        useZionClient: () => {
            return {
                ...actual.useZionClient(),
                client: {
                    isEntitled: () => true,
                    getUser: () => null,
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
                users: mockMembers,
                usersMap: mockUsersMap,
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

afterEach(() => {
    vi.clearAllMocks()
})

describe('SingleRolePanel', () => {
    test('should render empty fields when creating a new role', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const roleName = await getNameInput()
        const tokenSearch = screen.getByTestId('token-search')
        const userSearch = screen.getByTestId('user-search')
        const tokenPills = within(tokenSearch).queryAllByTestId(/^token-selector-pill/i)
        const userPills = within(userSearch).queryAllByTestId(/^user-selector-pill/i)
        expect(roleName).toHaveValue('')
        expect(tokenSearch).toBeInTheDocument()
        expect(userSearch).toBeInTheDocument()
        expect(tokenPills).toHaveLength(0)
        expect(userPills).toHaveLength(0)
    })
    test('should not contain delete role button when creating a new role', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const deleteRoleButton = screen.queryByTestId('delete-role-button')
        expect(deleteRoleButton).not.toBeInTheDocument()
    })
    test('should always contain an Everyone option in user search', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)

        await openUserSearch()

        const option = await getEveryoneOption()
        expect(option).toHaveTextContent('Everyone')
    })

    test('should not submit when name field is empty', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        await openUserSearch()
        const option = await getEveryoneOption()
        userEvent.click(option)
        const userSearch = screen.getByTestId('user-search')
        const userPills = await within(userSearch).findAllByTestId(/^user-pill-selector-pill/i)
        await waitFor(() => expect(userPills).toHaveLength(1))

        expect(submitButton).not.toBeDisabled()
        userEvent.click(submitButton)
        await screen.findByText(/role name is required/gi)
    })

    test('should not submit when token or users are empty, after filling in name input', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        userEvent.type(roleName, 'test role')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/test role/gi).length).toBe(1)
        })

        await waitFor(() => expect(submitButton).toBeDisabled())
    })

    test('should submit with gated tokens', async () => {
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=new'), vi.fn()])
        vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(useMockedCreateRoleTransaction)

        render(<Wrapper />)
        const submitButton = screen.getByTestId('submit-button')
        expect(submitButton).toBeDisabled()

        const roleName = await getNameInput()
        userEvent.type(roleName, 'new role 1')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 1/gi).length).toBe(1)
        })

        const option = await getFirstTokenOption()
        userEvent.click(option)
        await waitFor(() => expect(submitButton).not.toBeDisabled())
        userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 1',
                [Lib.Permission.Read],
                mockCollectionsForOwner?.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: [],
                    }),
                ),
                [],
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
        userEvent.type(roleName, 'new role 2')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 2/gi).length).toBe(1)
        })

        await openUserSearch()
        const option = await getEveryoneOption()
        userEvent.click(option)
        await waitFor(() => expect(submitButton).not.toBeDisabled())
        userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 2',
                [Lib.Permission.Read],
                [],
                [EVERYONE_ADDRESS],
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
        userEvent.type(roleName, 'new role 3')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 3/gi).length).toBe(1)
        })

        const tokenSearch = screen.getByTestId('token-search')
        const tokenInput = within(tokenSearch).getByTestId(/pill-selector-input/i)
        userEvent.click(tokenInput)
        const tokenOption = await getFirstTokenOption()
        userEvent.click(tokenOption)

        await openUserSearch()
        const everyoneOption = await getEveryoneOption()
        userEvent.click(everyoneOption)

        await waitFor(() => expect(submitButton).not.toBeDisabled())
        userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 3',
                [Lib.Permission.Read],
                mockCollectionsForOwner?.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: [],
                    }),
                ),
                [EVERYONE_ADDRESS],
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
        userEvent.type(roleName, 'new role 4')
        await waitFor(() => {
            expect(screen.getAllByDisplayValue(/new role 4/gi).length).toBe(1)
        })

        await openUserSearch()
        const everyoneOption = await getEveryoneOption()
        userEvent.click(everyoneOption)

        const readCheckbox = screen.getAllByTestId('toggle')
        // click the write checkbox
        userEvent.click(readCheckbox[1])

        await waitFor(() => expect(submitButton).not.toBeDisabled())
        userEvent.click(submitButton)

        await waitFor(() => {
            expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                'new role 4',
                [Lib.Permission.Read, Lib.Permission.Write],
                [],
                [EVERYONE_ADDRESS],
                {},
            )
        })
    })

    test('should render with default values when editing a role - user gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        roleDetailsMockData = roleWithEveryone
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Everyone'))
        const userSearch = screen.getByTestId('user-search')
        await waitFor(() =>
            expect(within(userSearch).getAllByTestId(/^user-pill-selector-pill/i)).toHaveLength(1),
        )
    })

    test('should render with default values when editing a role - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
    })

    test('should show error when only gated asset is removed - user gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        roleDetailsMockData = roleWithEveryone
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Everyone'))
        const userSearch = screen.getByTestId('user-search')
        await waitFor(() =>
            expect(within(userSearch).getAllByTestId(/^user-pill-selector-pill/i)).toHaveLength(1),
        )
        const deletePillButton = within(userSearch).getByTestId(/^user-pill-delete/i)

        userEvent.click(deletePillButton)
        await waitFor(() =>
            expect(
                within(userSearch).queryAllByTestId(/^user-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token or user/gi)
    })

    test('should not show error when only gated asset is removed then added - user gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=7'), vi.fn()])
        roleDetailsMockData = roleWithEveryone
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Everyone'))
        const userSearch = screen.getByTestId('user-search')
        await waitFor(() =>
            expect(within(userSearch).getAllByTestId(/^user-pill-selector-pill/i)).toHaveLength(1),
        )
        const deletePillButton = within(userSearch).getByTestId(/^user-pill-delete/i)

        userEvent.click(deletePillButton)
        await waitFor(() =>
            expect(
                within(userSearch).queryAllByTestId(/^user-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token or user/gi)
        const everyoneOption = await getEveryoneOption()
        userEvent.click(everyoneOption)
        await waitFor(() =>
            expect(within(userSearch).getAllByTestId(/^user-pill-selector-pill/i)).toHaveLength(1),
        )
        expect(screen.queryByText(/Select at least one token or user/gi)).toBeNull()
    })

    test('should show error when only gated asset is removed - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        deletePillButtons.forEach((button) => userEvent.click(button))

        await waitFor(() =>
            expect(
                within(tokenSearch).queryAllByTestId(/^token-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token or user/gi)
    })

    test('should not show error when only gated asset is removed then added - token gating', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        deletePillButtons.forEach((button) => userEvent.click(button))

        await waitFor(() =>
            expect(
                within(tokenSearch).queryAllByTestId(/^token-pill-selector-pill/i),
            ).to.toHaveLength(0),
        )
        await screen.findByText(/Select at least one token or user/gi)
        const option = await getFirstTokenOption()
        userEvent.click(option)
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                1,
            ),
        )
        expect(screen.queryByText(/Select at least one token or user/gi)).toBeNull()
    })

    test('should enable submit button when name is changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()
        userEvent.type(roleName, 'new name')
        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())
    })

    test('should enable submit button when permissions are changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()
        const checkboxes = screen.getAllByTestId('toggle')
        userEvent.click(checkboxes[2])
        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())
    })

    test('should enable submit button when tokens are changed', async () => {
        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()

        const deletePillButtons = within(tokenSearch).getAllByTestId(/^token-pill-delete/i)

        userEvent.click(deletePillButtons[0])

        await waitFor(() =>
            expect(
                within(tokenSearch).queryAllByTestId(/^token-pill-selector-pill/i),
            ).to.toHaveLength(1),
        )

        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())
    })

    test('should submit updated role with gated tokens and users', async () => {
        vi.spyOn(Lib, 'useUpdateRoleTransaction').mockImplementation(useMockedUpdateRoleTransaction)

        // map to the role id
        mockUseSearchParams.mockReturnValue([new URLSearchParams('roles=8'), vi.fn()])
        roleDetailsMockData = roleWithMemberMNft
        render(<Wrapper />)
        const roleName = await getNameInput()
        await waitFor(() => expect(roleName).toHaveValue('Member'))
        const tokenSearch = screen.getByTestId('token-search')
        await waitFor(() =>
            expect(within(tokenSearch).getAllByTestId(/^token-pill-selector-pill/i)).toHaveLength(
                2,
            ),
        )
        expect(screen.getByTestId('submit-button')).toBeDisabled()
        const everyoneOption = await getEveryoneOption()
        userEvent.click(everyoneOption)

        await waitFor(() => expect(screen.getByTestId('submit-button')).not.toBeDisabled())

        userEvent.click(screen.getByTestId('submit-button'))

        await waitFor(() => {
            expect(updateRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                roleWithMemberMNft.id,
                roleWithMemberMNft.name,
                roleWithMemberMNft.permissions,
                roleWithMemberMNft.tokens,
                [EVERYONE_ADDRESS],
                {},
            )
        })
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
        userEvent.click(deleteRoleButton)
        const confirmButton = await screen.findByTestId('confirm-delete-role-button')
        userEvent.click(confirmButton)

        await waitFor(() => {
            expect(deleteRoleTransactionSpy).toHaveBeenCalledWith(
                spaceRoomIdentifier,
                roleWithEveryone.id,
                {},
            )
        })
    })
})

async function getFirstTokenOption() {
    const tokenSearch = screen.getByTestId('token-search')
    const tokenInput = within(tokenSearch).getByTestId(/pill-selector-input/i)
    userEvent.click(tokenInput)
    const option = await waitFor(() =>
        within(tokenSearch).getAllByTestId(/^token-pill-selector-option/i),
    )
    return option[0]
}

async function openUserSearch() {
    const userSearch = screen.getByTestId('user-search')
    const userInput = within(userSearch).getByTestId(/pill-selector-input/i)
    userEvent.click(userInput)
}

async function getEveryoneOption() {
    const userSearch = screen.getByTestId('user-search')
    const userInput = within(userSearch).getByTestId(/pill-selector-input/i)
    userEvent.click(userInput)
    const option = await waitFor(() =>
        within(userSearch).getAllByTestId(/^user-pill-selector-option/i),
    )
    return option[0]
}

function getNameInput() {
    return screen.findByPlaceholderText(/Enter a name for the role/gi)
}
