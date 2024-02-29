/**
 * useCreateRoleTransaction.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 */
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateRoleTransaction } from '../../src/hooks/use-create-role-transaction'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import {
    createExternalTokenStruct,
    getTestGatingNftAddress,
    BasicRoleInfo,
    Permission,
    createMembershipStruct,
    NoopRuleData,
    ruleDataToOperations,
    OperationType,
} from '@river/web3'
import { TSigner } from '../../src/types/web3-types'

/**
 * This test suite tests the useRoles hook.
 */
describe('useCreateRoleTransaction', () => {
    test('create a new space role', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write]
        const moderatorRoleName = 'Moderator'
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        const moderatorTokens: string[] = []
        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const moderatorUsers = [mod1.address]
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const testGatingNftAddress = await getTestGatingNftAddress(chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet signer={provider.wallet} />
                    <TestComponent
                        spaceName={spaceName}
                        roleName={roleName}
                        permissions={permissions}
                        councilNftAddress={testGatingNftAddress}
                        newRolePermissions={moderatorPermissions}
                        newRoleName={moderatorRoleName}
                        newRoleTokens={moderatorTokens}
                        newRoleUsers={moderatorUsers}
                        signer={provider.wallet}
                    />
                </>
            </ZionTestApp>,
        )
        const clientRunning = screen.getByTestId('clientRunning')
        // wait for the client to be running
        await waitFor(
            () => expect(clientRunning).toHaveTextContent('true'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
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

        /* Act */
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        const rolesElement = screen.getByTestId('rolesElement')
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // click button to create the role
        fireEvent.click(createRoleButton)

        /* Assert */
        // verify the moderator role
        await assertRoleName(rolesElement, moderatorRoleName)
        // verify the moderator permissions
        await assertPermissions(rolesElement, moderatorRoleName, moderatorPermissions)
        // verify the moderator user exists
        await assertUsers(rolesElement, moderatorRoleName, moderatorUsers)
        // verify the council token entitlement is not present
        assertNoNft(rolesElement, moderatorRoleName, testGatingNftAddress)
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
    const { createSpaceTransactionWithRetries, data: txData, transactionStatus } = spaceTransaction
    const roleTransaction = useCreateRoleTransaction()
    const { createRoleTransaction } = roleTransaction
    const spaceId = txData?.spaceId

    const spaceNetworkId = spaceId ? spaceId : ''
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
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
                }),
                args.signer,
            )
        }

        void handleClick()
    }, [
        args.permissions,
        args.roleName,
        args.spaceName,
        args.signer,
        createSpaceTransactionWithRetries,
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
        args.newRolePermissions,
        args.newRoleName,
        args.newRoleTokens,
        args.newRoleUsers,
        createRoleTransaction,
        spaceNetworkId,
        args.signer,
    ])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickCreateRole}>Create Role</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <TransactionInfo for={roleTransaction} label="roleTransaction" />
            {transactionStatus === TransactionStatus.Success && (
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
                )}
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
        console.log({
            isLoading,
            error,
        })
        printRoleStruct(spaceRoles)
    }, [error, isLoading, spaceRoles])
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
async function assertRoleName(htmlElement: HTMLElement, roleName: string) {
    await waitFor(() => expect(htmlElement).toHaveTextContent(`roleName:${roleName}`))
}

async function assertPermissions(
    htmlElement: HTMLElement,
    roleName: string,
    permissions: Permission[],
) {
    // verify the permissions
    const expected = permissions.map((permission) => `${roleName}:permission:${permission}`)
    const allPermissions: Promise<void>[] = []
    for (const p of expected) {
        allPermissions.push(waitFor(() => expect(htmlElement).toHaveTextContent(p)))
    }
    await Promise.all(allPermissions)
}

function assertNoNft(htmlElement: HTMLElement, roleName: string, nftAddress: string) {
    expect(
        within(htmlElement).queryByText(`${roleName}:nftAddress:${nftAddress}`),
    ).not.toBeInTheDocument()
}

async function assertUsers(htmlElement: HTMLElement, roleName: string, users: string[]) {
    const expected = users.map((user) => `${roleName}:user:${user}`)
    const allUsers: Promise<void>[] = []
    for (const p of expected) {
        allUsers.push(waitFor(() => expect(htmlElement).toHaveTextContent(p)))
    }
    await Promise.all(allUsers)
}
