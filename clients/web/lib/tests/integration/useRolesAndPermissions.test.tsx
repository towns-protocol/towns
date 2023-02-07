/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Permission, RoleDetails } from '../../src/client/web3/ContractTypes'
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getCouncilNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateRoleTransaction } from '../../src/hooks/use-create-role-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'

function printRoleStruct(roles: SpaceDataTypes.RoleStructOutput[] | undefined) {
    if (roles) {
        for (const role of roles) {
            console.log({
                roleId: role.roleId.toNumber(),
                name: role.name,
            })
        }
    }
}

function printRoleDetails(roleDetails: RoleDetails | undefined) {
    if (roleDetails) {
        console.log(roleDetails)
    }
}

describe('useRoles', () => {
    test('get space roles', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        const councilNftAddress = chainId ? getCouncilNftAddress(chainId) : undefined
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write, Permission.AddRemoveChannels]
        const moderatorRoleName = 'Moderator'
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        const moderatorTokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const moderatorUsers = ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8']

        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }

        await provider.fundWallet()
        // create a view for alice
        const SpacesComponent = () => {
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
        const RoleDetailsComponent = ({ spaceId, roleId }: { spaceId: string; roleId: number }) => {
            const { isLoading, roleDetails, error } = useRoleDetails(spaceId, roleId)
            useEffect(() => {
                console.log({
                    isLoading,
                    error,
                })
                printRoleDetails(roleDetails)
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
        const RolesComponent = ({ spaceNetworkId }: { spaceNetworkId: string | undefined }) => {
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
                    {spaceRoles &&
                        spaceRoles.map((role) => {
                            return (
                                <div key={role.roleId.toNumber()}>
                                    <RoleDetailsComponent
                                        spaceId={spaceNetworkId!}
                                        roleId={role.roleId.toNumber()}
                                    />
                                </div>
                            )
                        })}
                </div>
            )
        }
        const TestComponent = () => {
            const { createSpaceTransactionWithRole, data: spaceId } = useCreateSpaceTransaction()
            const { createRoleTransaction } = useCreateRoleTransaction()
            const spaceNetworkId = spaceId ? spaceId.networkId : ''
            // handle click to create a space
            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    if (councilNftAddress) {
                        await createSpaceTransactionWithRole(
                            {
                                name: spaceName,
                                visibility: RoomVisibility.Public,
                            },
                            roleName,
                            [councilNftAddress],
                            permissions,
                        )
                    }
                }

                void handleClick()
            }, [createSpaceTransactionWithRole])
            // handle click to create a role
            const onClickCreateRole = useCallback(() => {
                const handleClick = async () => {
                    await createRoleTransaction(
                        spaceNetworkId,
                        moderatorRoleName,
                        moderatorPermissions,
                        moderatorTokens,
                        moderatorUsers,
                    )
                }

                void handleClick()
            }, [createRoleTransaction, spaceNetworkId])
            // the view
            return (
                <>
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateRole}>Create Role</button>
                    <SpaceContextProvider spaceId={spaceId}>
                        <>
                            <SpacesComponent />
                            <RolesComponent spaceNetworkId={spaceNetworkId} />
                        </>
                    </SpaceContextProvider>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet />
                    <TestComponent />
                </>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const spaceElement = screen.getByTestId('spacesElement')
        const rolesElement = screen.getByTestId('rolesElement')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createRoleButton = screen.getByRole('button', {
            name: 'Create Role',
        })
        // wait for the client to be running
        await waitFor(
            () => within(clientRunning).getByText('true'),
            TestConstants.DefaultWaitForTimeout,
        )

        /* Act */
        // click button to create the space
        // this will create the space and then the role
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(
            () => within(spaceElement).getByText(spaceName),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // click button to create the role
        fireEvent.click(createRoleButton)

        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElement, roleName)
        // verify the permissions
        await assertPermissions(rolesElement, roleName, permissions)
        // verify the token entitlement
        await assertNft(rolesElement, roleName, councilNftAddress, 1)
        // verify the moderator role
        await assertRoleName(rolesElement, moderatorRoleName)
        // verify the moderator permissions
        await assertPermissions(rolesElement, moderatorRoleName, moderatorPermissions)
        // verify the moderator user exists
        await assertUsers(rolesElement, moderatorRoleName, moderatorUsers)
        // verify the council token entitlement is not present
        assertNoNft(rolesElement, moderatorRoleName, councilNftAddress)
    }) // end test
}) // end describe

async function assertRoleName(htmlElement: HTMLElement, roleName: string) {
    await waitFor(
        () => within(htmlElement).getByText(`roleName:${roleName}`),
        TestConstants.DefaultWaitForTimeout,
    )
}

async function assertPermissions(
    htmlElement: HTMLElement,
    roleName: string,
    permissions: Permission[],
) {
    // verify the permissions
    const expected = permissions.map((permission) => `${roleName}:permission:${permission}`)
    const allPermissions: Promise<HTMLElement>[] = []
    for (const p of expected) {
        allPermissions.push(
            waitFor(() => within(htmlElement).getByText(p), TestConstants.DefaultWaitForTimeout),
        )
    }
    await Promise.all(allPermissions)
}

async function assertNft(
    htmlElement: HTMLElement,
    roleName: string,
    nftAddress: string,
    quantity: number,
) {
    await waitFor(
        () => within(htmlElement).getByText(`${roleName}:nftAddress:${nftAddress}`),
        TestConstants.DefaultWaitForTimeout,
    )
    await waitFor(
        () => within(htmlElement).getByText(`${roleName}:${nftAddress}:quantity:${quantity}`),
        TestConstants.DefaultWaitForTimeout,
    )
}

function assertNoNft(htmlElement: HTMLElement, roleName: string, nftAddress: string) {
    expect(
        within(htmlElement).queryByText(`${roleName}:nftAddress:${nftAddress}`),
    ).not.toBeInTheDocument()
}

async function assertUsers(htmlElement: HTMLElement, roleName: string, users: string[]) {
    const expected = users.map((user) => `${roleName}:user:${user}`)
    const allUsers: Promise<HTMLElement>[] = []
    for (const p of expected) {
        allUsers.push(
            waitFor(() => within(htmlElement).getByText(p), TestConstants.DefaultWaitForTimeout),
        )
    }
    await Promise.all(allUsers)
}
