import 'fake-indexeddb/auto'
import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import userEvent from '@testing-library/user-event'
import * as Router from 'react-router'
import { TestApp } from 'test/testUtils'
import { AuthenticatedRoutes } from 'routes/AuthenticatedRoutes'
import {
    everyoneRole,
    memberRole,
    mockMemberIds,
    mockMembers as mockUsers,
    mockUsersMap,
    roleDataWithBothRolesAssignedToChannel,
    spaceRoomIdentifier,
} from 'test/testMocks'
import { PATHS } from 'routes'
import {
    UseMockCreateRoleReturn,
    UseMockDeleteRoleReturn,
    UseMockUpdateRoleReturn,
    mockCreateTransactionWithSpy,
} from 'test/transactionHookMock'
import { EVERYONE_ADDRESS } from 'utils'
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { MOCK_CONTRACT_METADATA_ADDRESSES } from '../../../mocks/token-collections'
import { useSettingsTransactionsStore } from './store/hooks/settingsTransactionStore'

const navigateSpy = vi.fn()

vi.mock('react-router', async () => {
    const actual = (await vi.importActual('react-router')) as typeof Router
    return {
        ...actual,
        useNavigate: () => {
            const _navigate = actual.useNavigate()
            return (args: Router.To) => {
                navigateSpy(args)
                _navigate(args)
            }
        },
    }
})

// TODO: skipping membership validation altogether here, we shouldn't have to do this
vi.mock('routes/ValidateMembership', () => ({
    ValidateMembership: () => {
        return <Router.Outlet />
    },
}))

vi.mock('hooks/useRequireTransactionNetwork', () => {
    return {
        useRequireTransactionNetwork: () => ({
            isTransactionNetwork: true,
            name: 'Goerli',
            switchNetwork: () => null,
        }),
    }
})

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

// mock the viewport for VList
vi.mock('ui/components/VList/hooks/useViewport', async () => {
    const viewPort = [0, 777]
    return {
        useViewport: () => {
            return {
                viewport: viewPort,
                isScrolling: false,
            }
        },
    }
})

vi.mock('hooks/useSpaceInfoFromPathname', () => {
    return {
        useSpaceIdFromPathname: () => spaceRoomIdentifier.networkId,
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

const mockDataForUseMultipleRoleDetails = roleDataWithBothRolesAssignedToChannel

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
                users: mockUsers,
                usersMap: mockUsersMap,
            }
        },
        useSpaceMembers: () => {
            return {
                memberIds: mockMemberIds,
            }
        },

        useMultipleRoleDetails: () => {
            return {
                data: mockDataForUseMultipleRoleDetails,
                invalidateQuery: () => null,
            }
        },
        useCurrentWalletEqualsSignedInAccount: () => true,
    }
})

const Wrapper = () => {
    return (
        <TestApp
            initialEntries={[`/${PATHS.SPACES}/${spaceRoomIdentifier.slug}/${PATHS.SETTINGS}`]}
        >
            <Lib.SpaceContextProvider
                spaceId={{
                    slug: spaceRoomIdentifier.slug,
                    networkId: spaceRoomIdentifier.networkId,
                }}
            >
                <AuthenticatedRoutes />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
})

function getTabs() {
    const permissionsTab = screen.getByTestId('role-settings-permissions-tab')
    const gatingTab = screen.getByTestId('role-settings-gating-tab')
    const displayTab = screen.getByTestId('role-settings-display-tab')
    return {
        permissionsTab,
        gatingTab,
        displayTab,
    }
}

function waitForScreenToBeLoaded() {
    return waitFor(() => {
        expect(screen.getByTestId('space-settings-roles-nav')).toBeInTheDocument()
    })
}

function checkChangesInProgressToastVisible() {
    return waitFor(() => {
        expect(screen.getByTestId('role-settings-in-progress-toast')).toBeVisible()
    })
}

describe(
    'SpaceSettings',
    () => {
        test("should show the first role's permission tab when settings is loaded", async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const roleSettingsPermissions = screen.getByTestId('role-settings-permissions-content')
            const everyonePermissions = within(roleSettingsPermissions).getAllByRole('checkbox')

            expect(everyonePermissions.length).toBe(4)
            expect(everyonePermissions[0]).toBeChecked()
        })

        test('should show the correct state for everyone role on member and display tabs', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const { gatingTab, displayTab } = getTabs()
            fireEvent.click(gatingTab)
            const roleSettingsMembers = screen.getByTestId('role-settings-gating-content')
            const userGatedSection = within(roleSettingsMembers).getByTestId(
                'role-settings-gating-user-gated',
            )
            await within(userGatedSection).findByText(/all wallet addresses/gi)

            fireEvent.click(displayTab)

            const roleSettingsDisplayContent = screen.getByTestId('role-settings-display-content')
            const nameInput = await within(roleSettingsDisplayContent).findByPlaceholderText(
                /role name/gi,
            )
            expect(nameInput).toHaveValue('Everyone')
        })

        test('should prompt toast when change is made to permissions', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const roleSettingsPermissions = screen.getByTestId('role-settings-permissions-content')
            const everyonePermissions = within(roleSettingsPermissions).getAllByRole('checkbox')

            expect(everyonePermissions.length).toBe(4)

            fireEvent.click(everyonePermissions[0])
            expect(everyonePermissions[0]).not.toBeChecked()

            await checkChangesInProgressToastVisible()
        })

        test.skip('should update role name in sidebar and prompt toast when change is made to display name', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const { gatingTab, displayTab } = getTabs()
            fireEvent.click(gatingTab)
            const roleSettingsMembers = screen.getByTestId('role-settings-gating-content')
            const userGatedSection = within(roleSettingsMembers).getByTestId(
                'role-settings-gating-user-gated',
            )
            await within(userGatedSection).findByText(/all wallet addresses/gi)

            fireEvent.click(displayTab)

            const roleSettingsDisplayContent = screen.getByTestId('role-settings-display-content')
            const nameInput = await within(roleSettingsDisplayContent).findByPlaceholderText(
                /role name/gi,
            )

            userEvent.clear(nameInput)
            userEvent.type(nameInput, 'rasberry delight')

            await checkChangesInProgressToastVisible()

            await waitFor(() => {
                expect(screen.getAllByDisplayValue(/rasberry delight/gi).length).toBe(1)
            })

            await waitFor(() => {
                expect(screen.getAllByText(/rasberry delight/gi).length).toBe(1)
            })
        })

        test('should prompt toast when change is made to members', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const { gatingTab } = getTabs()
            fireEvent.click(gatingTab)
            const roleSettingsMembers = screen.getByTestId('role-settings-gating-content')
            const userGatedSection = within(roleSettingsMembers).getByTestId(
                'role-settings-gating-user-gated',
            )
            const addButton = await within(userGatedSection).findByRole('button', {
                name: /add users/gi,
            })
            userEvent.click(addButton)

            const memberListModal = await screen.findByTestId('role-settings-gating-modal')
            const members = await within(memberListModal).findAllByRole('checkbox')
            const saveButton = await within(memberListModal).findByRole('button', {
                name: /update/gi,
            })
            await waitFor(() => {
                expect(members.length).toBeGreaterThanOrEqual(2)
            })
            userEvent.click(members[0])
            userEvent.click(saveButton)
            await waitFor(() => {
                expect(memberListModal).not.toBeInTheDocument()
            })
            await checkChangesInProgressToastVisible()
        })

        test('should remove toast when state is set back to intitial state', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const roleSettingsPermissions = screen.getByTestId('role-settings-permissions-content')
            const everyonePermissions = within(roleSettingsPermissions).getAllByRole('checkbox')

            expect(everyonePermissions.length).toBe(4)

            fireEvent.click(everyonePermissions[0])
            expect(everyonePermissions[0]).not.toBeChecked()

            await checkChangesInProgressToastVisible()
            fireEvent.click(everyonePermissions[0])
            await waitFor(() => {
                expect(screen.getByTestId('role-settings-in-progress-toast')).not.toBeVisible()
            })
        })

        test('should move to another role and prompt toast when choosing to delete role', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const rolesNav = screen.getByTestId('space-settings-roles-nav')
            const rolesButton = within(rolesNav).getAllByRole('link')
            fireEvent.contextMenu(rolesButton[1])
            const removeButton = await screen.findByRole('button', { name: /remove role/gi })
            fireEvent.click(removeButton)

            await waitFor(() => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    `/${PATHS.SPACES}/${spaceRoomIdentifier.slug}/${PATHS.SETTINGS}/${PATHS.ROLES}/${everyoneRole.roleId}/permissions`,
                )
            })
            await checkChangesInProgressToastVisible()
        })

        test('should navigate to new role and prompt toast when new role button clicked', async () => {
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })
            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const newRoleButton = screen.getByText(/create new role/gi)
            fireEvent.click(newRoleButton)
            await screen.findByTestId('role-settings-display-content')

            await waitFor(() => {
                expect(navigateSpy).toHaveBeenCalledWith(`../roles/n-1/display`)
            })
            await checkChangesInProgressToastVisible()
        })

        test('saving multiple changes should result in multiple transactions called with the correct arguments', async () => {
            vi.spyOn(Lib, 'useCreateRoleTransaction').mockImplementation(
                useMockedCreateRoleTransaction,
            )
            vi.spyOn(Lib, 'useUpdateRoleTransaction').mockImplementation(
                useMockedUpdateRoleTransaction,
            )
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })

            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const rolesNav = screen.getByTestId('space-settings-roles-nav')
            const rolesButton = within(rolesNav).getAllByRole('link')

            // everyone role change
            const everyonePermissions = within(
                screen.getByTestId('role-settings-permissions-content'),
            ).getAllByRole('checkbox')
            await userEvent.click(everyonePermissions[0])

            // member role change
            await userEvent.click(rolesButton[1])
            const memberPermissions = within(
                screen.getByTestId('role-settings-permissions-content'),
            ).getAllByRole('checkbox')
            await userEvent.click(memberPermissions[0])

            // add new role
            const newRoleButton = screen.getByText(/create new role/gi)
            await userEvent.click(newRoleButton)

            const membersButton = screen.getAllByText(/gating/gi)[0]
            await userEvent.click(membersButton)

            const userGatedButton = screen.getByText(/Add users/)
            await userEvent.click(userGatedButton)

            const everyoneButton = screen.getByText(/all wallet addresses/gi)
            await userEvent.click(everyoneButton)

            const updateButton = screen.getByText(/update/gi)
            await userEvent.click(updateButton)

            await checkChangesInProgressToastVisible()

            const saveOnChainButton = screen.getByRole('button', { name: /save on chain/gi })

            await userEvent.click(saveOnChainButton)

            await waitFor(() => {
                expect(screen.getByTestId('role-settings-checkout-modal')).toBeVisible()
            })

            await waitFor(() => {
                const allAccordions = screen.getAllByTestId('accordion-group-item')
                expect(allAccordions.length).toBe(3)
            })

            const transactButton = screen.getByTestId('role-settings-checkout-modal-save-button')

            await userEvent.click(transactButton)

            await waitFor(() => {
                expect(createRoleTransactionSpy).toHaveBeenCalledWith(
                    spaceRoomIdentifier.networkId,
                    'New Role 1',
                    [Lib.Permission.Read],
                    [],
                    [EVERYONE_ADDRESS],
                    {},
                )
            })

            await waitFor(() => {
                expect(updateRoleTransactionSpy).toHaveBeenCalledWith(
                    spaceRoomIdentifier.networkId,
                    everyoneRole.roleId.toNumber(),
                    everyoneRole.name,
                    [],
                    [],
                    [EVERYONE_ADDRESS],
                    {},
                )
            })

            await waitFor(() => {
                expect(updateRoleTransactionSpy).toHaveBeenCalledWith(
                    spaceRoomIdentifier.networkId,
                    memberRole.roleId.toNumber(),
                    memberRole.name,
                    [Lib.Permission.Write],
                    MOCK_CONTRACT_METADATA_ADDRESSES.map((addr) =>
                        createTokenEntitlementStruct({ contractAddress: addr }),
                    ),
                    [],
                    {},
                )
            })

            expect(
                Object.keys(useSettingsTransactionsStore.getState().inProgressTransactions).length,
            ).toBe(3)
        })

        test('deleting a role and saving should create a delete role transaction with correct arguments', async () => {
            vi.spyOn(Lib, 'useDeleteRoleTransaction').mockImplementation(
                useMockedDeleteRoleTransaction,
            )
            vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
                isLoading: false,
                hasPermission: true,
                error: undefined,
            })

            render(<Wrapper />)
            await waitForScreenToBeLoaded()
            const rolesNav = screen.getByTestId('space-settings-roles-nav')
            const rolesButton = within(rolesNav).getAllByRole('link')

            fireEvent.contextMenu(rolesButton[1])
            const removeButton = await screen.findByRole('button', { name: /remove role/gi })
            fireEvent.click(removeButton)

            await checkChangesInProgressToastVisible()

            const saveOnChainButton = screen.getByRole('button', { name: /save on chain/gi })

            await userEvent.click(saveOnChainButton)

            await waitFor(() => {
                const allAccordions = screen.getAllByTestId('accordion-group-item')
                expect(allAccordions.length).toBe(1)
            })

            const transactButton = screen.getByTestId('role-settings-checkout-modal-save-button')

            await userEvent.click(transactButton)

            await waitFor(() => {
                expect(deleteRoleTransactionSpy).toHaveBeenCalledWith(
                    spaceRoomIdentifier.networkId,
                    memberRole.roleId.toNumber(),
                    {},
                )
            })
        })

        test.skip('should not be able to close modal while transactions are in progress', async () => {
            //
        })
        test.skip('should not be able to interact with settings post transaction, until clicking the "more changes" button', async () => {
            //
        })
    },
    { timeout: 60000 },
)
