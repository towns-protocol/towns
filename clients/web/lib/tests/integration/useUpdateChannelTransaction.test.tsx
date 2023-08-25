/**
 * @group dendrite
 */
import {
    CreateChannelInfo,
    RoomVisibility,
    UpdateChannelInfo,
} from 'use-zion-client/src/types/zion-types'
import React, { useCallback, useMemo } from 'react'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
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
import { useSpaceData } from '../../src/hooks/use-space-data'

/**
 * This test suite tests the useRoles hook.
 */
describe('useUpdateChannelTransaction', () => {
    test('create a new space, a new channel, and update the channel name', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const spaceRoleName = 'test_role'
        const channelName = 'channel_name'
        const channelTopic = 'channel_topic'
        const updatedChannelName = 'updated_channel_name'
        const updatedChannelTopic = 'updated_channel_topic'
        const permissions = [Permission.Read, Permission.Write]
        const chainId = (await provider.getNetwork()).chainId

        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const memberNftAddress = getMemberNftAddress(chainId)
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

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
                        channelTopic={channelTopic}
                        updatedChannelName={updatedChannelName}
                        updatedChannelTopic={updatedChannelTopic}
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

        // wait for space to be created
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        const channelElement = screen.getByTestId('channelElement')
        const SpaceHierachyElement = screen.getByTestId('spaceHierachyElement')

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
        await waitFor(
            () => expect(channelElement).toHaveTextContent(`channelName:${channelName}`),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(() => expect(SpaceHierachyElement).toHaveTextContent(channelName))

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
        await waitFor(() => expect(SpaceHierachyElement).toHaveTextContent(updatedChannelName))

        // verify the channel topic has changed
        await waitFor(() =>
            expect(channelElement).toHaveTextContent(`channelTopic:${updatedChannelTopic}`),
        )
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: {
    spaceName: string
    spaceRoleName: string
    channelName: string
    channelTopic: string
    permissions: Permission[]
    nftAddress: string
    updatedChannelName: string
    updatedChannelTopic: string
}): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const {
        data: spaceId,
        transactionStatus: createSpaceTxStatus,
        createSpaceTransactionWithRole,
    } = spaceTransaction
    const channelTransaction = useCreateChannelTransaction()
    const {
        data: channelId,
        createChannelTransaction,
        transactionStatus: createChannelTransactionStatus,
    } = channelTransaction
    const updateChannelTransactionInfo = useUpdateChannelTransaction()
    const { updateChannelTransaction, transactionStatus: updateChannelTransactionStatus } =
        updateChannelTransactionInfo
    const spaceNetworkId = spaceId ? spaceId.networkId : ''
    // Use the roles from the parent space to create the channel
    const { spaceRoles } = useRoles(spaceNetworkId)
    // memoize the role ids
    const roleIds = useMemo(() => {
        const roleIds: number[] = []
        if (spaceId && createSpaceTxStatus === TransactionStatus.Success) {
            if (spaceRoles) {
                for (const r of spaceRoles) {
                    roleIds.push(r.roleId)
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
                    topic: args.channelTopic,
                }
                await createChannelTransaction(createRoomInfo)
            }
        }
        void handleClick()
    }, [spaceId, args.channelName, args.channelTopic, roleIds, createChannelTransaction])
    // handle click to update a role
    const onClickUpdateChannel = useCallback(() => {
        const handleClick = async () => {
            if (spaceId && channelId) {
                const updateChannelInfo: UpdateChannelInfo = {
                    parentSpaceId: spaceId,
                    channelId,
                    updatedChannelName: args.updatedChannelName,
                    updatedRoleIds: roleIds,
                    updatedChannelTopic: args.updatedChannelTopic,
                }
                await updateChannelTransaction(updateChannelInfo)
                console.log('updateChannelTransaction called')
            } else {
                console.warn('spaceId or channelId is undefined')
            }
        }
        void handleClick()
    }, [
        args.updatedChannelName,
        args.updatedChannelTopic,
        channelId,
        roleIds,
        spaceId,
        updateChannelTransaction,
    ])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickCreateChannel}>Create Channel</button>
            <button onClick={onClickUpdateChannel}>Update Channel</button>
            <div data-testid="createSpaceTxStatus">{createSpaceTxStatus}</div>
            <div data-testid="createChannelTransactionStatus">{createChannelTransactionStatus}</div>
            <div data-testid="updateChannelTransactionStatus">{updateChannelTransactionStatus}</div>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <TransactionInfo for={channelTransaction} label="channelTransaction" />
            <TransactionInfo for={updateChannelTransactionInfo} label="updateChannelTransaction" />
            {createSpaceTxStatus === TransactionStatus.Success && (
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <SpaceHierachy />
                        <SpacesComponent />
                        <div data-testid="channelElement">
                            {createChannelTransactionStatus === TransactionStatus.Success &&
                                channelId && (
                                    <ChannelContextProvider channelId={channelId}>
                                        <ChannelComponent />
                                    </ChannelContextProvider>
                                )}
                        </div>
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
                <div key={element.key}>{element.name}</div>
            ))}
        </div>
    )
}

function SpaceHierachy() {
    const space = useSpaceData()
    const channelNames = space?.channelGroups.flatMap((c) =>
        c.channels.map((channel) => channel.label),
    )
    return (
        <div data-testid="spaceHierachyElement">
            {channelNames
                ? channelNames.map((channelName) => <div key={channelName}>{channelName}</div>)
                : null}
        </div>
    )
}

function ChannelComponent(): JSX.Element {
    const { channel } = useChannelData()
    const channelTopic = useMemo(() => {
        return channel?.topic ?? 'undefined'
    }, [channel?.topic])
    return (
        <div data-testid="channel">
            {channel && (
                <ChannelContextProvider channelId={channel.id}>
                    <>
                        <div key={`${channel.id.networkId}_${channel.label}`}>
                            channelName:{channel.label}
                        </div>{' '}
                        <div key={`${channel.id.networkId}_${channelTopic}`}>
                            channelTopic:{channelTopic}
                        </div>{' '}
                    </>
                </ChannelContextProvider>
            )}
        </div>
    )
}
