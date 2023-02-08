import { Permission, RoleDetails } from '../../src/client/web3/ContractTypes'
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getCouncilNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'

/**
 * This test suite tests the useRoles hook.
 */
describe('useRoles', () => {
    test('create space and get its member role', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write]
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const councilNftAddress = chainId ? getCouncilNftAddress(chainId) : undefined
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet />
                    <TestComponent
                        spaceName={spaceName}
                        roleName={roleName}
                        permissions={permissions}
                        councilNftAddress={councilNftAddress}
                    />
                </>
            </ZionTestApp>,
        )
        const clientRunning = screen.getByTestId('clientRunning')
        // wait for the client to be running
        await waitFor(() => within(clientRunning).getByText('true'))
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // get our test elements
        const spaceElement = screen.getByTestId('spacesElement')
        const rolesElement = screen.getByTestId('rolesElement')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })

        /* Act */
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(() => within(spaceElement).getByText(spaceName))

        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElement, roleName)
        // verify the permissions
        await assertPermissions(rolesElement, roleName, permissions)
        // verify the token entitlement
        await assertNft(rolesElement, roleName, councilNftAddress, 1)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    roleName: string
    permissions: Permission[]
    councilNftAddress: string | undefined
}): JSX.Element {
    const { createSpaceTransactionWithRole, data: spaceId } = useCreateSpaceTransaction()
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            if (args.councilNftAddress) {
                await createSpaceTransactionWithRole(
                    {
                        name: args.spaceName,
                        visibility: RoomVisibility.Public,
                    },
                    args.roleName,
                    [args.councilNftAddress],
                    args.permissions,
                )
            }
        }

        void handleClick()
    }, [
        args.councilNftAddress,
        args.permissions,
        args.roleName,
        args.spaceName,
        createSpaceTransactionWithRole,
    ])
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

/**
 * Print helper functions
 */
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

/**
 * Assert helper functions
 */
async function assertRoleName(htmlElement: HTMLElement, roleName: string) {
    await waitFor(() => within(htmlElement).getByText(`roleName:${roleName}`))
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
        allPermissions.push(waitFor(() => within(htmlElement).getByText(p)))
    }
    await Promise.all(allPermissions)
}

async function assertNft(
    htmlElement: HTMLElement,
    roleName: string,
    nftAddress: string,
    quantity: number,
) {
    await waitFor(() => within(htmlElement).getByText(`${roleName}:nftAddress:${nftAddress}`))
    await waitFor(() =>
        within(htmlElement).getByText(`${roleName}:${nftAddress}:quantity:${quantity}`),
    )
}
