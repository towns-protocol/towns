/**
 * useDeleteRoleTransaction.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 */
import React, { useCallback, useEffect, useMemo } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { createMembershipStruct, makeUniqueName } from './helpers/TestUtils'
import { useCreateRoleTransaction } from '../../src/hooks/use-create-role-transaction'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useDeleteRoleTransaction } from '../../src/hooks/use-delete-role-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/TownsClientTypes'
import {
    getTestGatingNftAddress,
    BasicRoleInfo,
    Permission,
    createExternalTokenStruct,
    NoopRuleData,
    ruleDataToOperations,
    OperationType,
} from '@river-build/web3'
import { TSigner } from '../../src/types/web3-types'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { getDynamicPricingModule } from '../../src/utils/web3'

/**
 * This test suite tests the useRoles hook.
 */
describe('useDeleteRoleTransaction', () => {
    test('delete a role', async () => {
        /* Arrange */
        const provider = new TownsTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write]
        const toBeDeletedRoleName = 'to-be-deleted-role'
        const toBeDeletedPermissions = [Permission.Read, Permission.Write]
        const toBeDeletedTokens: string[] = []
        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const toBeDeletedUsers = [mod1.address]
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const testGatingNftAddress = await getTestGatingNftAddress(chainId)
        if (!testGatingNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        render(
            <TownsTestApp provider={provider}>
                <>
                    <RegisterWallet signer={provider.wallet} />
                    <TestComponent
                        signer={provider.wallet}
                        spaceName={spaceName}
                        roleName={roleName}
                        permissions={permissions}
                        councilNftAddress={testGatingNftAddress}
                        newRolePermissions={toBeDeletedPermissions}
                        newRoleName={toBeDeletedRoleName}
                        newRoleTokens={toBeDeletedTokens}
                        newRoleUsers={toBeDeletedUsers}
                    />
                </>
            </TownsTestApp>,
        )
        const clientRunning = screen.getByTestId('clientRunning')
        // wait for the client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        if (!testGatingNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // get our test elements
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createRoleButton = screen.getByRole('button', {
            name: 'Create Role',
        })
        const DeleteRoleButton = screen.getByRole('button', {
            name: 'Delete Role',
        })
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)

        // wait for the space to be created
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        const rolesElement = screen.getByTestId('rolesElement')

        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // click button to create the role
        fireEvent.click(createRoleButton)
        await waitFor(() =>
            expect(rolesElement).toHaveTextContent(`roleName:${toBeDeletedRoleName}`),
        )

        /* Act */
        // click button to update the role
        fireEvent.click(DeleteRoleButton)

        /* Assert */
        // verify the toBeDeleted role is gone
        await assertNoRoleName(rolesElement, toBeDeletedRoleName)
        // verify the permissions for the role is gone
        await assertNoPermissions(rolesElement, toBeDeletedRoleName, toBeDeletedPermissions)
        // verify the users list does not contain the user
        await assertNoUsers(rolesElement, toBeDeletedRoleName, toBeDeletedUsers)
        // verify token entitlement has not changed
        assertNoNft(rolesElement, toBeDeletedRoleName, testGatingNftAddress)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    roleName: string
    permissions: Permission[]
    councilNftAddress: string
    newRoleName: string
    newRolePermissions: Permission[]
    newRoleTokens: string[]
    newRoleUsers: string[]
    signer: TSigner
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransactionWithRetries()
    const {
        createSpaceTransactionWithRetries,
        data: txData,
        transactionStatus: createSpaceTransactionStatus,
    } = spaceTransaction
    const spaceId = txData?.spaceId
    const createRoleTransactionInfo = useCreateRoleTransaction()
    const { createRoleTransaction, data } = createRoleTransactionInfo
    const deleteRoleTransactionInfo = useDeleteRoleTransaction()
    const { deleteRoleTransaction } = deleteRoleTransactionInfo
    const spaceNetworkId = spaceId ? spaceId : ''
    const roleIdentifier = data?.roleId
    const roleId = useMemo(() => roleIdentifier?.roleId ?? -1, [roleIdentifier])
    const { spaceDapp } = useTownsClient()

    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
            await createSpaceTransactionWithRetries(
                {
                    name: args.spaceName,
                },
                createMembershipStruct({
                    name: args.roleName,
                    permissions: args.permissions,
                    requirements: {
                        everyone: true,
                        users: [],
                        ruleData: NoopRuleData,
                    },
                    pricingModule: dynamicPricingModule.module,
                }),
                args.signer,
            )
        }
        void handleClick()
    }, [
        spaceDapp,
        createSpaceTransactionWithRetries,
        args.spaceName,
        args.roleName,
        args.permissions,
        args.signer,
    ])
    // handle click to create a role
    const onClickCreateRole = useCallback(() => {
        const handleClick = async () => {
            await createRoleTransaction(
                spaceNetworkId,
                args.newRoleName,
                args.newRolePermissions,
                args.newRoleUsers,
                createExternalTokenStruct(args.newRoleTokens as `0x${string}`[]),
                args.signer,
            )
        }
        void handleClick()
    }, [
        createRoleTransaction,
        spaceNetworkId,
        args.newRoleName,
        args.newRolePermissions,
        args.newRoleUsers,
        args.newRoleTokens,
        args.signer,
    ])
    // handle click to update a role
    const onClickDeleteRole = useCallback(() => {
        const handleClick = async () => {
            await deleteRoleTransaction(spaceNetworkId, roleId, args.signer)
        }
        void handleClick()
    }, [deleteRoleTransaction, spaceNetworkId, roleId, args.signer])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickCreateRole}>Create Role</button>
            <button onClick={onClickDeleteRole}>Delete Role</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <TransactionInfo for={createRoleTransactionInfo} label="createRoleTransaction" />
            <TransactionInfo for={deleteRoleTransactionInfo} label="deleteRoleTransaction" />
            {createSpaceTransactionStatus === TransactionStatus.Success && (
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <SpacesComponent />
                        <RolesComponent spaceNetworkId={spaceNetworkId} />
                    </>
                </SpaceContextProvider>
            )}
        </>
    )
}

function SpacesComponent(): JSX.Element {
    // spaces
    const { spaces } = useSpacesFromContract()
    return (
        <div data-testid="spacesElement">
            {spaces.map((element) => (
                <div key={element.key}>{element.name}</div>
            ))}
        </div>
    )
}

function RoleDetailsComponent({
    spaceId,
    roleId,
}: {
    spaceId: string
    roleId: number
}): JSX.Element {
    const { isLoading, roleDetails, error } = useRoleDetails(spaceId, roleId)
    useEffect(() => {
        console.log({
            isLoading,
            error,
            roleDetails,
        })
    }, [error, isLoading, roleDetails])
    return (
        <div key={`${spaceId}_${roleId}`}>
            <div>roleId:{roleDetails?.id}</div>
            <div>roleName:{roleDetails?.name}</div>
            <div>
                {/* permissions in the role */}
                {roleDetails?.permissions.map((permission) => (
                    <div key={permission}>
                        {roleDetails?.name}:permission:{permission}
                    </div>
                ))}
            </div>
            <div>
                {/* tokens in the role */}
                {ruleDataToOperations(roleDetails?.ruleData ? [roleDetails.ruleData] : []).map(
                    (operation) => {
                        switch (operation.opType) {
                            case OperationType.CHECK:
                                return (
                                    <div key={operation.opType}>
                                        <div>
                                            {roleDetails?.name}:{operation.contractAddress}
                                            :quantity:{operation.threshold.toString()}
                                        </div>
                                    </div>
                                )
                            default:
                                return <div key={operation.opType}></div>
                        }
                    },
                )}{' '}
            </div>
            <div>
                {/* users in the role */}
                {roleDetails?.users.map((user) => {
                    return (
                        <div key={user}>
                            <div>
                                {roleDetails?.name}:user:{user}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function RolesComponent({ spaceNetworkId }: { spaceNetworkId: string | undefined }): JSX.Element {
    const { isLoading, spaceRoles, error } = useRoles(spaceNetworkId)
    useEffect(() => {
        console.log('useDeleteRolTransaction::RolesComponent useRoles:', {
            spaceNetworkId,
            isLoading,
            error,
        })
        printRoleStruct(spaceRoles)
    }, [error, isLoading, spaceNetworkId, spaceRoles])
    return (
        <div data-testid="rolesElement">
            {spaceNetworkId &&
                spaceRoles &&
                spaceRoles.map((role) => {
                    return (
                        <div key={role.roleId}>
                            <RoleDetailsComponent spaceId={spaceNetworkId} roleId={role.roleId} />
                        </div>
                    )
                })}
        </div>
    )
}

/**
 * Print helper functions
 */
function printRoleStruct(roles: BasicRoleInfo[] | undefined) {
    if (roles) {
        for (const role of roles) {
            console.log({
                roleId: role.roleId,
                name: role.name,
            })
        }
    }
}

/**
 * Assert helper functions
 */
function assertNoRoleName(htmlElement: HTMLElement, roleName: string) {
    return waitFor(() =>
        expect(within(htmlElement).queryByText(`roleName:${roleName}`)).not.toBeInTheDocument(),
    )
}

function assertNoPermissions(
    htmlElement: HTMLElement,
    roleName: string,
    permissions: Permission[],
) {
    // verify the permissions
    const expected = permissions.map((permission) => `${roleName}:permission:${permission}`)
    const allPermissions: Promise<void>[] = []
    for (const p of expected) {
        allPermissions.push(
            waitFor(() => expect(within(htmlElement).queryByText(p)).not.toBeInTheDocument()),
        )
    }
    return Promise.all(allPermissions)
}

function assertNoNft(htmlElement: HTMLElement, roleName: string, nftAddress: string) {
    expect(
        within(htmlElement).queryByText(`${roleName}:nftAddress:${nftAddress}`),
    ).not.toBeInTheDocument()
}

function assertNoUsers(htmlElement: HTMLElement, roleName: string, users: string[]) {
    const expected = users.map((user) => `${roleName}:user:${user}`)
    const allUsers: Promise<void>[] = []
    for (const p of expected) {
        allUsers.push(
            waitFor(() => expect(within(htmlElement).queryByText(p)).not.toBeInTheDocument()),
        )
    }
    return Promise.all(allUsers)
}
