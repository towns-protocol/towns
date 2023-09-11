/**
 * useCreateRoleTransaction.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 * @group dendrite
 */
import { BasicRoleInfo, Permission } from '../../src/client/web3/ContractTypes'
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import {
    createExternalTokenStruct,
    getMemberNftAddress,
} from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateRoleTransaction } from '../../src/hooks/use-create-role-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TransactionStatus } from '../../src/client/ZionClientTypes'

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
        const mod1 = await TestConstants.getWalletWithMemberNft()
        const moderatorUsers = [mod1.address]
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const memberNftAddress = getMemberNftAddress(chainId)
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet />
                    <TestComponent
                        spaceName={spaceName}
                        roleName={roleName}
                        permissions={permissions}
                        councilNftAddress={memberNftAddress}
                        newRolePermissions={moderatorPermissions}
                        newRoleName={moderatorRoleName}
                        newRoleTokens={moderatorTokens}
                        newRoleUsers={moderatorUsers}
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
        if (!memberNftAddress) {
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
        assertNoNft(rolesElement, moderatorRoleName, memberNftAddress)
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
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const { createSpaceTransactionWithRole, data: spaceId, transactionStatus } = spaceTransaction
    const roleTransaction = useCreateRoleTransaction()
    const { createRoleTransaction } = roleTransaction
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            await createSpaceTransactionWithRole(
                {
                    name: args.spaceName,
                    visibility: RoomVisibility.Public,
                },
                args.roleName,
                createExternalTokenStruct([args.councilNftAddress]),
                args.permissions,
            )
        }

        void handleClick()
    }, [
        args.councilNftAddress,
        args.permissions,
        args.roleName,
        args.spaceName,
        createSpaceTransactionWithRole,
    ])
    // handle click to create a role
    const onClickCreateRole = useCallback(() => {
        const handleClick = async () => {
            await createRoleTransaction(
                spaceNetworkId,
                args.newRoleName,
                args.newRolePermissions,
                createExternalTokenStruct(args.newRoleTokens),
                args.newRoleUsers,
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
                {roleDetails?.tokens.map((token) => {
                    const nftAddress = token.contractAddress as string
                    const quantity = (token.quantity as BigNumber).toNumber()
                    return (
                        <div key={nftAddress}>
                            <div>
                                {roleDetails?.name}:nftAddress:{nftAddress}
                            </div>
                            <div>
                                {roleDetails?.name}:{nftAddress}:quantity:{quantity}
                            </div>
                        </div>
                    )
                })}
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
