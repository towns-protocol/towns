/**
 * useRoleDetails.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 */
import React, { useCallback, useEffect } from 'react'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import {
    getTestGatingNftAddress,
    BasicRoleInfo,
    Permission,
    createMembershipStruct,
} from '@river/web3'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { TSigner } from '../../src/types/web3-types'
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
                        signer={provider.wallet}
                    />
                </>
            </ZionTestApp>,
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
        await assertPermissions(rolesElement, roleName, permissions)
        // verify the token entitlement on the minter role - gated by the member nft address
        await assertNft(rolesElement, 'Minter', testGatingNftAddress, 1)
        // verify the token entitlement on the member role - gated by the space membership token address
        await assertNft(rolesElement, roleName, membershipTokenAddress.textContent, 1)
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
                    tokenAddresses: [args.councilNftAddress],
                }),
                args.signer,
            )
        }

        void handleClick()
    }, [
        args.councilNftAddress,
        args.permissions,
        args.roleName,
        args.spaceName,
        args.signer,
        createSpaceTransactionWithRetries,
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
    const [membershipTokenAddress, setMembershipTokenAddress] = React.useState<string | undefined>()
    const { spaceDapp } = useZionClient()

    useEffect(() => {
        let cancel = false
        async function setMembershipAddress() {
            if (!spaceDapp || !spaceNetworkId) {
                return
            }
            if (!cancel) {
                setMembershipTokenAddress(
                    await spaceDapp?.getTownMembershipTokenAddress(spaceNetworkId),
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
