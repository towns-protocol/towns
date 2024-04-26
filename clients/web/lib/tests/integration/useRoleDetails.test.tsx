/**
 * useRoleDetails.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 */
import React, { useCallback, useEffect } from 'react'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { createMembershipStruct, makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TransactionStatus } from '../../src/client/TownsClientTypes'
import {
    getTestGatingNftAddress,
    BasicRoleInfo,
    Permission,
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
describe('useRoleDetails', () => {
    test('create a space and get its role details', async () => {
        /* Arrange */
        const provider = new TownsTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const roleName = 'Test Role'
        const permissions = [Permission.Read, Permission.Write]
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
            <TownsTestApp provider={provider}>
                <>
                    <RegisterWallet signer={provider.wallet} />
                    <TestComponent
                        spaceName={spaceName}
                        roleName={roleName}
                        permissions={permissions}
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
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)

        // wait for space to be created
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        const membershipTokenAddress = await waitFor(
            () => screen.getByTestId('membershipTokenAddress'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        if (!membershipTokenAddress.textContent) {
            throw new Error('membershipTokenAddress is undefined')
        }
        const rolesElement = screen.getByTestId('rolesElement')
        /* Assert */
        // verify the role name, permissions, token entitlements for the space.
        // in the test components, each field is tagged with this pattern <roleName>:<field>:<value>.
        // verify the role name.
        await assertRoleName(rolesElement, roleName)
        // verify the permissions
        await assertRoleDetails(
            rolesElement,
            roleName,
            permissions,
            membershipTokenAddress.textContent,
            1,
        )
        // verify the token entitlement on the minter role - gated by the member nft address
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    roleName: string
    permissions: Permission[]
    councilNftAddress: string
    signer: TSigner
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransactionWithRetries()
    const { createSpaceTransactionWithRetries, data: txData, transactionStatus } = spaceTransaction
    const spaceId = txData?.spaceId

    const spaceNetworkId = spaceId ? spaceId : ''
    const { spaces } = useSpacesFromContract()
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
            console.log('createSpaceTransactionWithRole done')
        }

        void handleClick()
    }, [
        spaceDapp,
        createSpaceTransactionWithRetries,
        args.spaceName,
        args.roleName,
        args.permissions,
        args.councilNftAddress,
        args.signer,
    ])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            {transactionStatus === TransactionStatus.Success && (
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
            )}
        </>
    )
}

function RoleDetailsComponent({
    spaceId,
    roleId,
    membershipTokenAddress,
}: {
    membershipTokenAddress: string | undefined
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
            <div>, membershipTokenAddress:</div>
            {membershipTokenAddress && (
                <div data-testid={`membershipTokenAddress-${roleDetails?.name}`}>
                    <div>{membershipTokenAddress}</div>
                </div>
            )}
            <div>
                {/* permissions in the role */}
                {', permissions:'}
                {roleDetails?.permissions.map((permission) => (
                    <div key={permission}>{permission},</div>
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
                                            , {operation.contractAddress}
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
    const [membershipTokenAddress, setMembershipTokenAddress] = React.useState<string | undefined>()
    const { spaceDapp } = useTownsClient()

    useEffect(() => {
        let cancel = false
        async function setMembershipAddress() {
            if (!spaceDapp || !spaceNetworkId) {
                return
            }
            if (!cancel) {
                setMembershipTokenAddress(
                    await spaceDapp?.getSpaceMembershipTokenAddress(spaceNetworkId),
                )
            }
        }
        void setMembershipAddress()

        return () => {
            cancel = true
        }
    }, [spaceDapp, spaceNetworkId])

    useEffect(() => {
        console.log({
            isLoading,
            error,
        })
        printRoleStruct(spaceRoles)
    }, [error, isLoading, spaceRoles])
    return (
        <div data-testid="rolesElement">
            {membershipTokenAddress && (
                <div data-testid="membershipTokenAddress">{membershipTokenAddress}</div>
            )}
            {spaceNetworkId &&
                spaceRoles &&
                spaceRoles.map((role) => {
                    return (
                        <div key={role.roleId}>
                            <RoleDetailsComponent
                                membershipTokenAddress={membershipTokenAddress}
                                spaceId={spaceNetworkId}
                                roleId={role.roleId}
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
    await waitFor(() =>
        expect(htmlElement).toHaveTextContent(
            `roleName:${roleName}, nftAddress:${nftAddress}, quantity:${quantity}`,
        ),
    )
    */
}
