import { Permission } from '../../src/client/web3/ContractTypes'
import React, { useCallback, useEffect, useMemo } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getMemberNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useMultipleRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TestConstants } from './helpers/TestConstants'

/**
 * This test suite tests the useRoles hook.
 */
describe('useRoleDetails', () => {
    test('create a space and get multiple role details', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceNameA = makeUniqueName('alice')
        const spaceNameB = makeUniqueName('alice')
        const roleNameA = 'Role A'
        const permissionsA = [Permission.Read, Permission.Write]

        const roleNameB = 'Role B'
        const permissionsB = [Permission.Read]

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
                    <TestComponentMultiple
                        spaceNames={[spaceNameA, spaceNameB]}
                        roleName={[roleNameA, roleNameB]}
                        permissions={[permissionsA, permissionsB]}
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
        // this will create 2 spaces with a member role
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceNameA),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceNameB),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        const rolesElement = screen.getAllByTestId('rolesElement')

        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElement[0], roleNameA)
        // verify the permissions
        await assertPermissions(rolesElement[0], roleNameA, permissionsA)
        // verify the token entitlement
        await assertNft(rolesElement[0], roleNameA, memberNftAddress, 1)

        screen.debug(undefined, Infinity)

        await assertRoleName(rolesElement[1], roleNameB)
        // verify the permissions
        await assertPermissions(rolesElement[1], roleNameB, permissionsB)
        // verify the token entitlement
        await assertNft(rolesElement[1], roleNameB, memberNftAddress, 1)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponentMultiple(args: {
    spaceNames: string[]
    roleName: string[]
    permissions: Permission[][]
    councilNftAddress: string
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const { createSpaceTransactionWithRole, data: spaceId } = spaceTransaction
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            await createSpaceTransactionWithRole(
                {
                    name: args.spaceNames[0],
                    visibility: RoomVisibility.Public,
                },
                args.roleName[0],
                [args.councilNftAddress],
                args.permissions[0],
            )

            await createSpaceTransactionWithRole(
                {
                    name: args.spaceNames[1],
                    visibility: RoomVisibility.Public,
                },
                args.roleName[1],
                [args.councilNftAddress],
                args.permissions[1],
            )
        }

        void handleClick()
    }, [
        args.councilNftAddress,
        args.permissions,
        args.roleName,
        args.spaceNames,
        createSpaceTransactionWithRole,
    ])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <SpaceContextProvider spaceId={spaceId}>
                <>
                    <SpacesComponent />
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
                <div key={element.key}>
                    <div>{element.name}</div>
                    <MultipleRolesComponent spaceNetworkId={element.networkId} />
                </div>
            ))}
        </div>
    )
}

function MultipleRoleDetailsComponent(props: { spaceId: string; roleIds: number[] }) {
    const { data } = useMultipleRoleDetails(props.spaceId, props.roleIds)
    return (
        <>
            {data?.map((role) => {
                return (
                    <div data-testid={`role-${role.name}`} key={`role-${role.name}`}>
                        <div>roleName:{role.name}</div>
                        <div>{role.id}</div>
                        <div>
                            {' '}
                            {role.permissions.map((permission) => (
                                <div key={permission}>
                                    {role.name}:permission:{permission}
                                </div>
                            ))}
                        </div>
                        <div>
                            {' '}
                            {role?.tokens.map((token) => {
                                const nftAddress = token.contractAddress as string
                                const quantity = (token.quantity as BigNumber).toNumber()
                                return (
                                    <div key={nftAddress}>
                                        <div>
                                            {role?.name}:nftAddress:{nftAddress}
                                        </div>
                                        <div>
                                            {role?.name}:{nftAddress}:quantity:{quantity}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </>
    )
}

function MultipleRolesComponent({
    spaceNetworkId,
}: {
    spaceNetworkId: string | undefined
}): JSX.Element {
    const { isLoading, spaceRoles, error } = useRoles(spaceNetworkId)
    const roleIds = useMemo(() => spaceRoles?.map((role) => role.roleId.toNumber()), [spaceRoles])

    useEffect(() => {
        console.log({
            isLoading,
            error,
        })
        printRoleStruct(spaceRoles)
    }, [error, isLoading, spaceRoles])
    return (
        <div data-testid="rolesElement">
            {roleIds && spaceNetworkId && (
                <MultipleRoleDetailsComponent spaceId={spaceNetworkId} roleIds={roleIds} />
            )}
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
