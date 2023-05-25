/**
 * @group dendrite
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { BigNumber } from 'ethers'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { RoomIdentifier } from '../../dist'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { SpaceDataTypes } from '../../src/client/web3/shims/SpaceShim'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getMemberNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useAddRoleToChannelTransaction } from '../../src/hooks/use-add-role-channel-transaction'
import { useChannelData } from '../../src/hooks/use-channel-data'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoleDetails } from '../../src/hooks/use-role-details'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'

/**
 * This test suite tests the useAddRolesToChannel hook.
 */
describe('useAddRolesToChannel', () => {
    test('add a role to a channel', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const channelName = 'foochannel'
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
                        channelName={channelName}
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
        const channelElement = screen.getByTestId('channelElement')
        const rolesElement = screen.getByTestId('rolesElement')
        const rolesCount = screen.getByTestId('rolesCount')
        const addedRoleToChannelElement = screen.getByTestId('added-role-transaction')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createChannelButton = screen.getByRole('button', {
            name: 'Create Channel',
        })
        const addRoleToChannelButton = screen.getByRole('button', {
            name: 'Add Role To Channel',
        })
        /* Act */
        // click button to create the space
        // this will create the space with no roles
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        fireEvent.click(createChannelButton)
        // wait for the channel name to render
        await waitFor(
            () => expect(channelElement).toHaveTextContent(`channelName:${channelName}`),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // wait for the roles count to render
        await waitFor(() => expect(rolesCount).toHaveTextContent(`rolesCount:2`))
        // click button to add Test role to channel
        fireEvent.click(addRoleToChannelButton)
        await waitFor(
            () => expect(addedRoleToChannelElement).toHaveTextContent(`addedRoleToChannel:true`),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        /* Assert */
        await assertRoleChannel(rolesElement, roleName)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    channelName: string
    roleName: string
    permissions: Permission[]
    councilNftAddress: string
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const {
        createSpaceTransactionWithRole,
        data: spaceId,
        transactionStatus: createSpaceTxStatus,
    } = spaceTransaction

    const channelTransaction = useCreateChannelTransaction()
    const {
        createChannelTransaction,
        data: channelId,
        isLoading: isLoadingChannel,
        error: createChannelError,
        transactionStatus: createChannelTxStatus,
        transactionHash: createChannelTxHash,
    } = channelTransaction
    const addRoleTransaction = useAddRoleToChannelTransaction()
    const { addRoleToChannelTransaction, transactionStatus: addRoleToChannelTxStatus } =
        addRoleTransaction
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    const { spaceRoles } = useRoles(spaceNetworkId)

    const [addedRoleToChannel, setAddedRoleToChannel] = useState(false)

    useEffect(() => {
        if (addRoleToChannelTxStatus === TransactionStatus.Success) {
            console.log(`useEffect::addRoleToChannelTxStatus: `, addRoleToChannelTxStatus)
            setAddedRoleToChannel(true)
        }
    }, [addRoleToChannelTxStatus, setAddedRoleToChannel])

    const roleIds = useMemo(() => {
        const roleIds: number[] = []
        if (spaceId && createSpaceTxStatus === TransactionStatus.Success) {
            if (spaceRoles) {
                console.log(`spaceRoles: `, spaceRoles)
                for (const r of spaceRoles) {
                    roleIds.push(r.roleId.toNumber())
                }
            }
        }
        return roleIds
    }, [spaceId, createSpaceTxStatus, spaceRoles])
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
    // handle click to create a channel
    const onClickCreateChannel = useCallback(() => {
        const handleClick = async () => {
            if (spaceId) {
                await createChannelTransaction({
                    name: args.channelName,
                    visibility: RoomVisibility.Public,
                    parentSpaceId: spaceId,
                    roleIds: [],
                })
            }
        }
        void handleClick()
        console.log(`onClickCreateChannel: spaceId: `, spaceId?.networkId)
    }, [spaceId, createChannelTransaction, args.channelName])

    useEffect(() => {
        console.log('TestComponent', 'createChannelTransactionStates', {
            isLoadingChannel,
            channelId,
            createChannelError,
            createChannelTxStatus,
            createChannelTxHash,
        })
    }, [
        channelId,
        createChannelError,
        createChannelTxHash,
        createChannelTxStatus,
        isLoadingChannel,
    ])

    // handle click to update a role
    const onClickAddRoleToChannel = useCallback(() => {
        console.log('!!!! onClickAddRoleToChannel', { roleIds, channelId, spaceNetworkId })
        const handleClick = async () => {
            if (channelId) {
                await addRoleToChannelTransaction(spaceNetworkId, channelId.networkId, roleIds[0])
            }
        }
        void handleClick()
    }, [addRoleToChannelTransaction, roleIds, channelId, spaceNetworkId])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickCreateChannel}>Create Channel</button>
            <button onClick={onClickAddRoleToChannel}>Add Role To Channel</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <TransactionInfo for={channelTransaction} label="channelTransaction" />
            <TransactionInfo for={addRoleTransaction} label="addRoleTransaction" />
            <SpaceContextProvider spaceId={spaceId}>
                <>
                    <SpacesComponent />
                    <div data-testid="channelElement">
                        {channelId && (
                            <ChannelContextProvider channelId={channelId}>
                                <ChannelComponent channelId={channelId} />
                            </ChannelContextProvider>
                        )}
                    </div>
                    <div data-testid="added-role-transaction">
                        addedRoleToChannel:{addedRoleToChannel.toString()}
                    </div>
                    <div data-testid="rolesCount">rolesCount:{roleIds.length}</div>
                    <div>
                        <RolesComponent spaceNetworkId={spaceNetworkId} />
                    </div>
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

function ChannelComponent({ channelId }: { channelId: RoomIdentifier }): JSX.Element {
    // channel data
    const { channel } = useChannelData()
    return (
        <div data-testid="channel">
            {channel && (
                <ChannelContextProvider channelId={channelId}>
                    <>
                        <div key={channel.id.networkId}>channelName:{channel.label}</div>{' '}
                    </>
                </ChannelContextProvider>
            )}
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
        console.log(`RoleDetailsComponent:`, {
            isLoading,
            error,
            roleDetails,
        })
    }, [isLoading, roleDetails, error])
    return (
        <div>
            {!isLoading && (
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
            )}
        </div>
    )
}

function RolesComponent({ spaceNetworkId }: { spaceNetworkId: string | undefined }): JSX.Element {
    const { isLoading, spaceRoles, error } = useRoles(spaceNetworkId)
    useEffect(() => {
        console.log(`RolesComponent:`, {
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
async function assertRoleChannel(htmlElement: HTMLElement, roleName: string) {
    await waitFor(
        () => expect(htmlElement).toHaveTextContent(`roleName:${roleName}`),
        TestConstants.DoubleDefaultWaitForTimeout,
    )
}
