/**
 * useRoleDetails.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 * @group dendrite
 *
 */
import React, { useCallback, useEffect } from 'react'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getMemberNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'

/**
 * This test suite tests the useRoles hook.
 */
describe('useRoleDetails', () => {
    test('create a space and get its role details', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write]
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const memberNftAddress = getMemberNftAddress(chainId)
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
                        councilNftAddress={memberNftAddress}
                    />
                </>
            </ZionTestApp>,
        )
        const clientRunning = screen.getByTestId('clientRunning')
        // wait for the client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        if (!memberNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // get our test elements
        const spaceElement = screen.getByTestId('spacesElement')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })

        /* Act */
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        const rolesElement = screen.getByTestId('rolesElement')
        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElement, roleName)
        // verify the permissions
        await assertPermissions(rolesElement, roleName, permissions)
        // verify the token entitlement
        await assertNft(rolesElement, roleName, memberNftAddress, 1)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    roleName: string
    permissions: Permission[]
    councilNftAddress: string
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const { createSpaceTransactionWithRole, data: spaceId } = spaceTransaction
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    const { spaces } = useSpacesFromContract()

    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
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
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <SpaceContextProvider spaceId={spaceId}>
                <>
                    <div data-testid="spacesElement">
                        {spaces.map((element) => (
                            <div key={element.key}>{element.name}</div>
                        ))}
                    </div>
                    {spaces.length > 0 && <RolesComponent spaceNetworkId={spaceNetworkId} />}
                </>
            </SpaceContextProvider>
        </>
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
                        <div key={role.roleId.toNumber()}>
                            <RoleDetailsComponent
                                spaceId={spaceNetworkId}
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

/**
 * Assert helper functions
 */
async function assertRoleName(htmlElement: HTMLElement, roleName: string) {
    await waitFor(
        () => expect(htmlElement).toHaveTextContent(`roleName:${roleName}`),
        TestConstants.DoubleDefaultWaitForTimeout,
    )
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

async function assertNft(
    htmlElement: HTMLElement,
    roleName: string,
    nftAddress: string,
    quantity: number,
) {
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(`${roleName}:nftAddress:${nftAddress}`),
    )
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(`${roleName}:${nftAddress}:quantity:${quantity}`),
    )
}
