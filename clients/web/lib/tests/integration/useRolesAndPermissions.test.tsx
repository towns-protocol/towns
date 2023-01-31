/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Permission, RoleDetails } from '../../src/client/web3/ContractTypes'
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getCouncilNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
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
                        {roleDetails?.permissions.map((permission) => (
                            <div key={permission}>permission:{permission}</div>
                        ))}
                    </div>
                    <div>
                        {roleDetails?.tokens.map((token) => {
                            const nftAddress = token.contractAddress as string
                            const quantity = (token.quantity as BigNumber).toNumber()
                            return (
                                <div key={nftAddress}>
                                    <div>nftAddress:{nftAddress}</div>
                                    <div>
                                        quantity:{nftAddress}@{quantity}
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
            // the view
            return (
                <>
                    <button onClick={onClickCreateSpace}>Create Space</button>
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
            TestConstants.DefaultWaitForTimeout,
        )

        /* Assert */
        // verify the role name, permissions, token entitlements.
        // in the test components, each field is tagged with this pattern: <field>:<value>.
        // verify the role name.
        await waitFor(
            () => within(rolesElement).getByText(`roleName:${roleName}`),
            TestConstants.DefaultWaitForTimeout,
        )
        // verify the permissions
        const expectedPermissions = permissions.map((permission) => `permission:${permission}`)
        const permissionPromises: Promise<HTMLElement>[] = []
        for (const p of expectedPermissions) {
            permissionPromises.push(
                waitFor(
                    () => within(rolesElement).getByText(p),
                    TestConstants.DefaultWaitForTimeout,
                ),
            )
        }
        await Promise.all(permissionPromises)
        // verify the token address
        await waitFor(
            () => within(rolesElement).getByText(`nftAddress:${councilNftAddress}`),
            TestConstants.DefaultWaitForTimeout,
        )
        // verify the token quantity. should be 1.
        await waitFor(
            () => within(rolesElement).getByText(`quantity:${councilNftAddress}@1`),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
