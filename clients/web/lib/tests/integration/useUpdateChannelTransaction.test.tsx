import {
    CreateChannelInfo,
    RoomVisibility,
    UpdateChannelInfo,
} from 'use-zion-client/src/types/zion-types'
import React, { useCallback, useMemo } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterWallet } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getMemberNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useChannelData } from '../../src/hooks/use-channel-data'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { useUpdateChannelTransaction } from '../../src/hooks/use-update-channel-transaction'
import { TestConstants } from './helpers/TestConstants'

/**
 * This test suite tests the useRoles hook.
 */
describe('useUpdateChannelTransaction', () => {
    test('create a new space, a new channel, and update the channel name', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const spaceRoleName = 'test_role'
        const channelName = 'channel_t'
        const updatedChannelName = 'updated_channel_t'
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
                        spaceRoleName={spaceRoleName}
                        permissions={permissions}
                        nftAddress={memberNftAddress}
                        channelName={channelName}
                        updatedChannelName={updatedChannelName}
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
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createChannelButton = screen.getByRole('button', {
            name: 'Create Channel',
        })
        const updateChannelButton = screen.getByRole('button', {
            name: 'Update Channel',
        })
        const createSpaceTxStatus = screen.getByTestId('createSpaceTxStatus')
        const createChannelTransactionStatus = screen.getByTestId('createChannelTransactionStatus')
        const updateChannelTransactionStatus = screen.getByTestId('updateChannelTransactionStatus')
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)
        await waitFor(
            () => expect(createSpaceTxStatus).toHaveTextContent('Success'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // wait for the space name to render
        await waitFor(() => expect(spaceElement).toHaveTextContent(spaceName))
        // click button to create the channel
        fireEvent.click(createChannelButton)
        await waitFor(
            () => expect(createChannelTransactionStatus).toHaveTextContent('Success'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(() => expect(channelElement).toHaveTextContent(`channelName:${channelName}`))

        /* Act */
        // click button to update the channel name
        fireEvent.click(updateChannelButton)
        await waitFor(
            () => expect(updateChannelTransactionStatus).toHaveTextContent('Success'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        /* Assert */
        // verify the channel name has changed
        await waitFor(() =>
            expect(channelElement).toHaveTextContent(`channelName:${updatedChannelName}`),
        )
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    spaceRoleName: string
    channelName: string
    permissions: Permission[]
    nftAddress: string
    updatedChannelName: string
}): JSX.Element {
    const {
        data: spaceId,
        transactionStatus: createSpaceTxStatus,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()
    const {
        data: channelId,
        createChannelTransaction,
        transactionStatus: createChannelTransactionStatus,
    } = useCreateChannelTransaction()
    const { updateChannelTransaction, transactionStatus: updateChannelTransactionStatus } =
        useUpdateChannelTransaction()
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    // Use the roles from the parent space to create the channel
    const { spaceRoles } = useRoles(spaceNetworkId)
    // memoize the role ids
    const roleIds = useMemo(() => {
        const roleIds: number[] = []
        if (spaceId && createSpaceTxStatus === TransactionStatus.Success) {
            if (spaceRoles) {
                for (const r of spaceRoles) {
                    roleIds.push(r.roleId.toNumber())
                }
            }
        }
        return roleIds
    }, [createSpaceTxStatus, spaceId, spaceRoles])
    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            await createSpaceTransactionWithRole(
                {
                    name: args.spaceName,
                    visibility: RoomVisibility.Public,
                },
                args.spaceRoleName,
                [args.nftAddress],
                args.permissions,
            )
        }
        void handleClick()
    }, [
        args.nftAddress,
        args.permissions,
        args.spaceName,
        args.spaceRoleName,
        createSpaceTransactionWithRole,
    ])
    // handle click to create a channel
    const onClickCreateChannel = useCallback(() => {
        const handleClick = async () => {
            if (spaceId) {
                const createRoomInfo: CreateChannelInfo = {
                    name: args.channelName,
                    visibility: RoomVisibility.Public,
                    parentSpaceId: spaceId,
                    roleIds,
                }
                await createChannelTransaction(createRoomInfo)
            }
        }
        void handleClick()
    }, [spaceId, args.channelName, roleIds, createChannelTransaction])
    // handle click to update a role
    const onClickUpdateChannel = useCallback(() => {
        const handleClick = async () => {
            if (spaceId && channelId) {
                const updateChannelInfo: UpdateChannelInfo = {
                    parentSpaceId: spaceId,
                    channelId,
                    updatedChannelName: args.updatedChannelName,
                }
                await updateChannelTransaction(updateChannelInfo)
                console.log('updateChannelTransaction called')
            } else {
                console.warn('spaceId or channelId is undefined')
            }
        }
        void handleClick()
    }, [args.updatedChannelName, channelId, spaceId, updateChannelTransaction])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickCreateChannel}>Create Channel</button>
            <button onClick={onClickUpdateChannel}>Update Channel</button>
            <div data-testid="createSpaceTxStatus">{createSpaceTxStatus}</div>
            <div data-testid="createChannelTransactionStatus">{createChannelTransactionStatus}</div>
            <div data-testid="updateChannelTransactionStatus">{updateChannelTransactionStatus}</div>
            <SpaceContextProvider spaceId={spaceId}>
                <>
                    <SpacesComponent />
                    <div data-testid="channelElement">
                        {channelId && (
                            <ChannelContextProvider channelId={channelId}>
                                <ChannelComponent />
                            </ChannelContextProvider>
                        )}
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

function ChannelComponent(): JSX.Element {
    const { channel } = useChannelData()
    return (
        <div data-testid="channel">
            {channel && (
                <ChannelContextProvider channelId={channel.id}>
                    <>
                        <div key={channel.id.networkId}>channelName:{channel.label}</div>{' '}
                    </>
                </ChannelContextProvider>
            )}
        </div>
    )
}
