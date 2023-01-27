/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { CreateChannelInfo, RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import React, { useCallback, useMemo } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterWallet } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { getCouncilNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from './helpers/TestUtils'
import { useChannelData } from '../../src/hooks/use-channel-data'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useRolesAndPermissions } from '../../src/hooks/use-roles-and-permissions'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'

describe('useCreateChannelTransaction', () => {
    test('user can create channel', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        const councilNftAddress = chainId ? getCouncilNftAddress(chainId) : undefined
        const spaceName = makeUniqueName('alice')
        const channelName = 'test channel'
        await provider.fundWallet()
        // create a view for alice
        const SpacesComponent = () => {
            // spaces
            const { spaces } = useSpacesFromContract()
            return (
                <div data-testid="spaces">
                    {spaces.map((element) => (
                        <div key={element.key}>{element.name}</div>
                    ))}
                </div>
            )
        }

        const ChannelComponent = () => {
            const { channel } = useChannelData()
            return <div>{channel?.label}</div>
        }

        const TestComponent = () => {
            const { getRolesFromSpace } = useRolesAndPermissions()
            const {
                createSpaceTransactionWithRole,
                data: spaceId,
                transactionStatus: createSpaceTxStatus,
            } = useCreateSpaceTransaction()
            const {
                createChannelTransaction,
                isLoading: isLoadingChannel,
                data: channelId,
                error: createChannelError,
                transactionStatus: createChannelTxStatus,
                transactionHash: createChannelTxHash,
            } = useCreateChannelTransaction()

            // Use the roles from the parent space to create the channel
            const spaceRoles = useMemo(() => {
                const spaceRoles: number[] = []

                const getSpaceRoles = async () => {
                    if (spaceId && createSpaceTxStatus === TransactionStatus.Success) {
                        const roles = await getRolesFromSpace(spaceId.networkId)
                        if (roles) {
                            for (const r of roles) {
                                spaceRoles.push(r.roleId.toNumber())
                            }
                        }
                    }
                }

                void getSpaceRoles()
                return spaceRoles
            }, [getRolesFromSpace, spaceId, createSpaceTxStatus])

            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    if (councilNftAddress) {
                        await createSpaceTransactionWithRole(
                            {
                                name: spaceName,
                                visibility: RoomVisibility.Public,
                            },
                            'Test Role',
                            [councilNftAddress],
                            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
                        )
                    }
                }

                void handleClick()
            }, [createSpaceTransactionWithRole])

            // callback to create a channel with zion token entitlement
            const onClickCreateChannel = useCallback(() => {
                const handleClick = async (parentSpaceId: RoomIdentifier) => {
                    const createRoomInfo: CreateChannelInfo = {
                        name: channelName,
                        visibility: RoomVisibility.Public,
                        parentSpaceId,
                        roleIds: spaceRoles,
                    }
                    await createChannelTransaction(createRoomInfo)
                }

                if (spaceId) {
                    void handleClick(spaceId)
                }
            }, [createChannelTransaction, spaceId, spaceRoles])

            console.log('TestComponent', 'createChannelTransactionStates', {
                isLoadingChannel,
                channelId,
                createChannelError,
                createChannelTxStatus,
                createChannelTxHash,
            })
            // the view
            return (
                <>
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateChannel}>Create Channel</button>
                    <SpaceContextProvider spaceId={spaceId}>
                        <>
                            <SpacesComponent />
                            <div data-testid="channel">
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
        // render it
        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet />
                    <TestComponent />
                </>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const spaceElement = screen.getByTestId('spaces')
        const channelElement = screen.getByTestId('channel')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createChannelButton = screen.getByRole('button', {
            name: 'Create Channel',
        })
        // wait for the client to be running
        await waitFor(
            () => within(clientRunning).getByText('true'),
            TestConstants.DefaultWaitForTimeout,
        )
        // click button to create the space
        fireEvent.click(createSpaceButton)
        // wait for the space name to render
        await waitFor(
            () => within(spaceElement).getByText(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        /* Act */
        // click button to create the channel
        fireEvent.click(createChannelButton)

        /* Assert */
        await waitFor(
            () => within(channelElement).getByText(channelName),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
