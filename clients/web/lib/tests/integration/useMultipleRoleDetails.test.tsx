/**
 * @group core
 */
import React, { useCallback, useEffect, useMemo } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { createMembershipStruct, makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useMultipleRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/TownsClientTypes'
import {
    getTestGatingNftAddress,
    BasicRoleInfo,
    Permission,
    NoopRuleData,
    ruleDataToOperations,
    OperationType,
    createOperationsTree,
    LOCALHOST_CHAIN_ID,
    CheckOperationType,
    getDynamicPricingModule,
} from '@river-build/web3'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { TSigner } from '../../src/types/web3-types'

/**
 * This test suite tests the useRoles hook.
 */
describe('useMultipleRoleDetails', () => {
    test('create a space and get multiple role details', async () => {
        /* Arrange */
        const provider = new TownsTestWeb3Provider()
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
                    <TestComponentMultiple
                        spaceNames={[spaceNameA, spaceNameB]}
                        roleName={[roleNameA, roleNameB]}
                        permissions={[permissionsA, permissionsB]}
                        councilNftAddress={testGatingNftAddress}
                        signer={provider.wallet}
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

        /* Act */
        // click button to create the space
        // this will create 2 spaces with a member role
        fireEvent.click(createSpaceButton)

        // wait for space to be created
        const spaceElement = await waitFor(() => screen.getByTestId('spacesElement'), {
            timeout: TestConstants.DefaultWaitForTimeoutMS * 10,
        })

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
        // verify the role details
        await assertRoleDetails(
            rolesElementA,
            roleNameA,
            permissionsA,
            membershipTokenAddressRoleA.textContent,
            1,
        )

        screen.debug(undefined, Infinity)

        const rolesElementB = await waitFor(() => screen.getByTestId('role-Role B'))
        const membershipTokenAddressRoleB = await waitFor(() =>
            screen.getByTestId('membershipTokenAddress-Role B'),
        )
        if (!membershipTokenAddressRoleB.textContent) {
            throw new Error('membershipTokenAddress is undefined')
        }
        await assertRoleName(rolesElementB, roleNameB)
        // verify the role details
        await assertRoleDetails(
            rolesElementB,
            roleNameB,
            permissionsB,
            membershipTokenAddressRoleB.textContent,
            1,
        )
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponentMultiple(args: {
    spaceNames: string[]
    roleName: string[]
    permissions: Permission[][]
    councilNftAddress: string
    signer: TSigner
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransactionWithRetries()
    const { createSpaceTransactionWithRetries, data: txData, transactionStatus } = spaceTransaction
    const spaceId = txData?.spaceId
    const { spaceDapp } = useTownsClient()

    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
            await createSpaceTransactionWithRetries(
                {
                    name: args.spaceNames[0],
                },
                createMembershipStruct({
                    name: args.roleName[0],
                    permissions: args.permissions[0],
                    requirements: {
                        everyone: true,
                        users: [],
                        ruleData: NoopRuleData,
                    },
                    pricingModule: dynamicPricingModule.module,
                }),
                args.signer,
            )

            await createSpaceTransactionWithRetries(
                {
                    name: args.spaceNames[1],
                },
                createMembershipStruct({
                    name: args.roleName[1],
                    permissions: args.permissions[1],
                    requirements: {
                        everyone: false,
                        users: [],
                        ruleData: createOperationsTree([
                            {
                                address: args.councilNftAddress as `0x${string}`,
                                chainId: BigInt(LOCALHOST_CHAIN_ID),
                                type: CheckOperationType.ERC721,
                            },
                        ]),
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
        args.spaceNames,
        args.roleName,
        args.permissions,
        args.signer,
        args.councilNftAddress,
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
    const { spaceDapp } = useTownsClient()

    useEffect(() => {
        let cancel = false
        async function setMembershipAddress() {
            if (!spaceDapp || !props.spaceId) {
                return
            }
            if (!cancel) {
                setMembershipTokenAddress(
                    await spaceDapp?.getSpaceMembershipTokenAddress(props.spaceId),
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
                        <div>roleName:{role.name}</div>
                        <div>, membershipTokenAddress:</div>
                        {membershipTokenAddress && (
                            <div data-testid={`membershipTokenAddress-${role.name}`}>
                                <div>{membershipTokenAddress}</div>
                            </div>
                        )}
                        <div>
                            {', permissions:'}
                            {role.permissions.map((permission) => (
                                <div key={permission}>{permission},</div>
                            ))}
                        </div>
                        <div>
                            {' '}
                            {ruleDataToOperations(role?.ruleData ? [role.ruleData] : []).map(
                                (operation) => {
                                    switch (operation.opType) {
                                        case OperationType.CHECK:
                                            return (
                                                <div key={operation.opType}>
                                                    <div>
                                                        , {operation.contractAddress}
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

async function assertRoleDetails(
    htmlElement: HTMLElement,
    roleName: string,
    permissions: Permission[],
    membershipTokenAddress: string,
    _quantity: number,
) {
    const expectedPermissions = permissions.map((permission) => permission.toString()).join(',')
    await waitFor(() => expect(htmlElement).toBeInTheDocument())
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(
            `roleName:${roleName}, membershipTokenAddress:${membershipTokenAddress}, permissions:${expectedPermissions},`,
        ),
    )
    /*
    todo: https://linear.app/hnt-labs/issue/HNT-5145/implement-ruleentitlementshim-to-return-the-xchain-op-details
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(
            `roleName:${roleName}, nftAddress:${nftAddress}, quantity:${quantity}`,
        ),
    )
    */
}
