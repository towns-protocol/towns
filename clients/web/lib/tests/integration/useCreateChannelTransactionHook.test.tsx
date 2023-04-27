/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { CreateChannelInfo, RoomVisibility } from 'use-zion-client/src/types/zion-types'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { RoomIdentifier } from '../../src/types/room-identifier'
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
import { useTransactionStore } from '../../src/store/use-transactions-store'
import { ZTEvent } from '../../src/types/timeline-types'
import { MatrixEvent, MsgType as MatrixMsgType, RoomEvent } from 'matrix-js-sdk'
import { useZionContext } from '../../src/components/ZionContextProvider'

describe('useCreateChannelTransactionHook', () => {
    test('user can create channel', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const memberNftAddress = getMemberNftAddress(chainId)
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
            const { matrixClient } = useZionContext()
            const spaceTransaction = useCreateSpaceTransaction()
            const {
                createSpaceTransactionWithRole,
                data: spaceId,
                transactionStatus: createSpaceTxStatus,
            } = spaceTransaction
            const spaceNetworkId = spaceId?.networkId ? spaceId.networkId : ''
            const channelTransaction = useCreateChannelTransaction()
            const {
                createChannelTransaction,
                isLoading: isLoadingChannel,
                data: channelId,
                error: createChannelError,
                transactionStatus: createChannelTxStatus,
                transactionHash: createChannelTxHash,
            } = channelTransaction
            // Use the roles from the parent space to create the channel
            const { spaceRoles } = useRoles(spaceNetworkId)
            const transactions = useTransactionStore((state) => state.transactions)

            const [seenTransactions, setSeenTransactions] = useState<Record<string, undefined>>({})
            const [numberOfChannelBlockchainEvents, setNumberOfChannelBlockchainEvents] =
                useState(0)

            useEffect(() => {
                setSeenTransactions((t) => {
                    const newState = { ...t }
                    Object.keys(transactions).forEach((tx) => {
                        newState[tx] = undefined
                    })
                    return newState
                })
            }, [transactions])

            useEffect(() => {
                function onBlockchainTransaction(event: MatrixEvent) {
                    const content = event.getContent()
                    if (
                        event.getType() === MatrixMsgType.Notice &&
                        content.kind === ZTEvent.BlockchainTransaction
                    ) {
                        setNumberOfChannelBlockchainEvents((t) => t + 1)
                    }
                }
                matrixClient?.on(RoomEvent.Timeline, onBlockchainTransaction)

                return () => {
                    matrixClient?.off(RoomEvent.Timeline, onBlockchainTransaction)
                }
            }, [matrixClient])

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
            }, [spaceId, createSpaceTxStatus, spaceRoles])

            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    await createSpaceTransactionWithRole(
                        {
                            name: spaceName,
                            visibility: RoomVisibility.Public,
                        },
                        'Test Role',
                        [memberNftAddress],
                        [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
                    )
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
                        roleIds,
                    }
                    await createChannelTransaction(createRoomInfo)
                }

                if (spaceId) {
                    void handleClick(spaceId)
                }
            }, [createChannelTransaction, roleIds, spaceId])

            useEffect(() => {
                console.log('useCreateChannelTransactionHook', 'createChannelTransactionStates', {
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

            // the view
            return (
                <>
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateChannel}>Create Channel</button>
                    <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
                    <TransactionInfo for={channelTransaction} label="channelTransaction" />
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
                            <div data-testid="transactions">{Object.keys(transactions).length}</div>
                            <div data-testid="seen-transactions">
                                {Object.keys(seenTransactions).length}
                            </div>
                            <div data-testid="channel-blockchain-events">
                                {numberOfChannelBlockchainEvents}
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
        const transactions = screen.getByTestId('transactions')
        const transactionsNumber = screen.getByTestId('seen-transactions')
        const blockchainEvents = screen.getByTestId('channel-blockchain-events')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createChannelButton = screen.getByRole('button', {
            name: 'Create Channel',
        })
        // wait for the client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // click button to create the space
        fireEvent.click(createSpaceButton)
        await waitFor(() => expect(transactionsNumber).toHaveTextContent('1'))
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        /* Act */
        // click button to create the channel
        fireEvent.click(createChannelButton)
        await waitFor(() => expect(transactionsNumber).toHaveTextContent('2'))
        await waitFor(() => expect(transactions).toHaveTextContent('0'))
        await waitFor(() => expect(blockchainEvents).toHaveTextContent('1'))

        /* Assert */
        await waitFor(() => expect(channelElement).toHaveTextContent(channelName))
    }) // end test
}) // end describe
