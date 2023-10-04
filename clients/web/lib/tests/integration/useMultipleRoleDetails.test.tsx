/**
 * @group dendrite
 * @group casablanca
 */
import React, { useCallback, useEffect, useMemo } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useMultipleRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import { getMemberNftAddress, BasicRoleInfo, Permission, createMembershipStruct } from '@river/web3'
import { useZionClient } from '../../src/hooks/use-zion-client'

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
        if (!memberNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

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
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })

        /* Act */
        // click button to create the space
        // this will create 2 spaces with a member role
        fireEvent.click(createSpaceButton)

        // wait for space to be created
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceNameA),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceNameB),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        await waitFor(() => expect(screen.getAllByTestId('rolesElement')).toHaveLength(2))

        const rolesElementA = await waitFor(() => screen.getByTestId('role-Role A'))
        const membershipTokenAddressRoleA = await waitFor(() =>
            screen.getByTestId('membershipTokenAddress-Role A'),
        )
        if (!membershipTokenAddressRoleA.textContent) {
            throw new Error('membershipTokenAddress is undefined')
        }
        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElementA, roleNameA)
        // verify the permissions
        await assertPermissions(rolesElementA, roleNameA, permissionsA)
        // verify the token entitlement
        await assertNft(rolesElementA, roleNameA, membershipTokenAddressRoleA.textContent, 1)

        screen.debug(undefined, Infinity)

        const rolesElementB = await waitFor(() => screen.getByTestId('role-Role B'))
        const membershipTokenAddressRoleB = await waitFor(() =>
            screen.getByTestId('membershipTokenAddress-Role B'),
        )
        if (!membershipTokenAddressRoleB.textContent) {
            throw new Error('membershipTokenAddress is undefined')
        }
        await assertRoleName(rolesElementB, roleNameB)
        // verify the permissions
        await assertPermissions(rolesElementB, roleNameB, permissionsB)
        // verify the token entitlement
        await assertNft(rolesElementB, roleNameB, membershipTokenAddressRoleB.textContent, 1)
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
    const { createSpaceTransactionWithRole, data: spaceId, transactionStatus } = spaceTransaction
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            await createSpaceTransactionWithRole(
                {
                    name: args.spaceNames[0],
                    visibility: RoomVisibility.Public,
                },
                createMembershipStruct({
                    name: args.roleName[0],
                    permissions: args.permissions[0],
                    tokenAddresses: [args.councilNftAddress],
                }),
            )

            await createSpaceTransactionWithRole(
                {
                    name: args.spaceNames[1],
                    visibility: RoomVisibility.Public,
                },
                createMembershipStruct({
                    name: args.roleName[1],
                    permissions: args.permissions[1],
                    tokenAddresses: [args.councilNftAddress],
                }),
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
            {transactionStatus === TransactionStatus.Success && (
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <SpacesComponent />
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
                <div key={element.key} data-testid={`Space:${element.name}`}>
                    <div>{element.name}</div>
                    <MultipleRolesComponent spaceNetworkId={element.networkId} />
                </div>
            ))}
        </div>
    )
}

function MultipleRoleDetailsComponent(props: { spaceId: string; roleIds: number[] }) {
    const { data } = useMultipleRoleDetails(props.spaceId, props.roleIds)
    const [membershipTokenAddress, setMembershipTokenAddress] = React.useState<string | undefined>()
    const { spaceDapp } = useZionClient()

    useEffect(() => {
        let cancel = false
        async function setMembershipAddress() {
            if (!spaceDapp || !props.spaceId) {
                return
            }
            if (!cancel) {
                setMembershipTokenAddress(
                    await spaceDapp?.getTownMembershipTokenAddress(props.spaceId),
                )
            }
        }
        void setMembershipAddress()

        return () => {
            cancel = true
        }
    }, [spaceDapp, props.spaceId])

    return (
        <>
            {data?.map((role) => {
                return (
                    <div data-testid={`role-${role.name}`} key={`role-${role.name}`}>
                        {membershipTokenAddress && (
                            <div data-testid={`membershipTokenAddress-${role.name}`}>
                                {membershipTokenAddress}
                            </div>
                        )}
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
    const roleIds = useMemo(() => spaceRoles?.map((role) => role.roleId), [spaceRoles])

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
    await waitFor(() => expect(htmlElement).toBeInTheDocument())
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
    await waitFor(() => expect(htmlElement).toBeInTheDocument())
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
    await waitFor(() => expect(htmlElement).toBeInTheDocument())
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(`${roleName}:nftAddress:${nftAddress}`),
    )
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(`${roleName}:${nftAddress}:quantity:${quantity}`),
    )
}
