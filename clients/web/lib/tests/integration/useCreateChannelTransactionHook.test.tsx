/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import { CreateChannelInfo } from 'use-towns-client/src/types/towns-types'
import React, { useCallback, useEffect, useMemo } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/TownsClientTypes'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { createMembershipStruct, makeUniqueName } from './helpers/TestUtils'
import { useChannelData } from '../../src/hooks/use-channel-data'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useRoles } from '../../src/hooks/use-roles'
import { useSpacesFromContract } from '../../src/hooks/use-spaces-from-contract'
import { useTransactionStore } from '../../src/store/use-transactions-store'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { getTestGatingNftAddress, NoopRuleData, Permission } from '@river-build/web3'
import { TSigner } from '../../src/types/web3-types'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { getDynamicPricingModule } from '../../src/utils/web3'

describe('useCreateChannelTransactionHook', () => {
    test('user can create channel', async () => {
        /* Arrange */
        const provider = new TownsTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const testGatingNftAddress = await getTestGatingNftAddress(chainId)
        if (!testGatingNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const spaceName = makeUniqueName('alice')
        const channelName = 'test channel'
        await provider.fundWallet()
        await provider.mintMockNFT()

        // create a view for alice
        const SpacesComponent = () => {
            // spaces
            const { spaces } = useSpacesFromContract()
            const spaceData = useSpaceData()
            return (
                <>
                    <div data-testid="spaces">
                        {spaces.map((element) => (
                            <div key={element.key}>{element.name}</div>
                        ))}
                    </div>
                    <div data-testid="spaceData">{JSON.stringify(spaceData)}</div>
                </>
            )
        }

        const ChannelComponent = () => {
            const { channel } = useChannelData()
            return (
                <>
                    <div data-testid="useChannelData-data">{JSON.stringify(channel)}</div>
                    <div data-testid="channelLabel">{channel?.label}</div>
                </>
            )
        }

        const TestComponent = ({ signer }: { signer: TSigner }) => {
            const spaceTransaction = useCreateSpaceTransactionWithRetries()
            const {
                createSpaceTransactionWithRetries,
                data: txData,
                transactionStatus: createSpaceTxStatus,
            } = spaceTransaction
            const spaceId = txData?.spaceId
            const spaceNetworkId = spaceId ? spaceId : ''
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
            const transactions = useTransactionStore()
            const { spaceDapp } = useTownsClient()

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
            }, [spaceId, createSpaceTxStatus, spaceRoles])

            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
                    await createSpaceTransactionWithRetries(
                        {
                            name: spaceName,
                        },
                        createMembershipStruct({
                            name: 'Test Role',
                            permissions: [
                                Permission.Read,
                                Permission.Write,
                                Permission.AddRemoveChannels,
                            ],
                            requirements: {
                                everyone: true,
                                users: [],
                                ruleData: NoopRuleData,
                            },
                            pricingModule: dynamicPricingModule.module,
                        }),
                        signer,
                    )
                }

                void handleClick()
            }, [spaceDapp, createSpaceTransactionWithRetries, signer])

            // callback to create a channel with towns token entitlement
            const onClickCreateChannel = useCallback(() => {
                const handleClick = async (parentSpaceId: string) => {
                    const createRoomInfo: CreateChannelInfo = {
                        name: channelName,
                        parentSpaceId,
                        roleIds,
                    }
                    const channelInfo = await createChannelTransaction(createRoomInfo, signer)
                    console.log(channelInfo)
                }

                if (spaceId) {
                    void handleClick(spaceId)
                }
            }, [createChannelTransaction, roleIds, spaceId, signer])

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
                    {createSpaceTxStatus === TransactionStatus.Success && (
                        <SpaceContextProvider spaceId={spaceId}>
                            <>
                                <SpacesComponent />
                                <div data-testid="channelInfo">{`channelId: ${
                                    channelId ? JSON.stringify(channelId) : 'undefined'
                                } createChannelTxStatus ${createChannelTxStatus}`}</div>
                                <div data-testid="channel">
                                    {createChannelTxStatus === TransactionStatus.Success &&
                                        channelId && (
                                            <ChannelContextProvider channelId={channelId}>
                                                <ChannelComponent />
                                            </ChannelContextProvider>
                                        )}
                                </div>
                                <div data-testid="transactions">
                                    {Object.keys(transactions).map((id) => {
                                        return (
                                            <div data-testid={'transactionItem'} key={id}>
                                                {JSON.stringify(transactions[id])}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        </SpaceContextProvider>
                    )}
                </>
            )
        }
        // render it
        render(
            <TownsTestApp provider={provider}>
                <>
                    <RegisterWallet signer={provider.wallet} />
                    <TestComponent signer={provider.wallet} />
                </>
            </TownsTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
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

        const spaceElement = await waitFor(
            () => screen.getByTestId('spaces'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        const channelElement = screen.getByTestId('channel')

        const transactionItems = await screen.findAllByTestId('transactionItem')
        expect(transactionItems.length).toBeGreaterThan(0) // any # greater than 0 b/c createSpace retries
        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        /* Act */
        // click button to create the channel
        fireEvent.click(createChannelButton)
        await waitFor(() => {
            const transactionItems = screen.getAllByTestId('transactionItem')
            expect(transactionItems.length).toBeGreaterThan(1)
        }, TestConstants.DoubleDefaultWaitForTimeout)

        /* Assert */
        await waitFor(
            () => expect(channelElement).toHaveTextContent(channelName),
            TestConstants.DecaDefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
