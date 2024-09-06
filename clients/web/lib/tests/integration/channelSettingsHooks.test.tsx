/**
 * @group core
 */
import React from 'react'
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { Permission } from '@river-build/web3'
import { LoginWithWallet } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TSigner } from '../../src/types/web3-types'
import { useChannelData } from '../../src/hooks/use-channel-data'
import { useSetChannelAutojoin } from '../../src/hooks/use-set-channel-autojoin'
import { useSetHideUserJoinLeave } from '../../src/hooks/use-set-hide-user-join-leave'

describe('channelSettingsHooks', () => {
    test('autojoin and hideUserLeaveJoin events are accurate in useChannelData', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])

        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])
        // create a channel
        const channelId = await bob.createChannel(
            {
                name: 'channel 1',
                parentSpaceId: spaceId,
                roles: [], // default member role
                channelSettings: {
                    autojoin: true,
                    hideUserJoinLeaveEvents: false,
                },
            },
            bob.provider.wallet,
        )
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()

        const TestComponent = ({ signer }: { signer: TSigner }) => {
            const { channel } = useChannelData()
            const { mutate: setChannelAutojoin } = useSetChannelAutojoin()
            const { mutate: setChannelHideUserJoinLeaveEvents } = useSetHideUserJoinLeave()

            return (
                <>
                    <LoginWithWallet signer={signer} />
                    <button
                        data-testid="toggleAutojoin"
                        onClick={() =>
                            void setChannelAutojoin({
                                spaceId,
                                channelId,
                                autojoin: !channel?.isAutojoin,
                            })
                        }
                    >
                        toggleAutojoin
                    </button>
                    <button
                        data-testid="toggleHideUserJoinLeaveEvents"
                        onClick={() =>
                            void setChannelHideUserJoinLeaveEvents({
                                spaceId,
                                channelId,
                                hideEvents: !channel?.hideUserJoinLeaveEvents,
                            })
                        }
                    >
                        toggleHideUserJoinLeaveEvents
                    </button>
                    <div data-testid="autojoin">{channel?.isAutojoin?.toString()}</div>
                    <div data-testid="hideUserJoinLeaveEvents">
                        {channel?.hideUserJoinLeaveEvents?.toString()}
                    </div>
                </>
            )
        }
        // render it
        render(
            <TownsTestApp provider={bob.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent signer={bob.provider.wallet} />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </TownsTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')

        // wait for the channel join
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))

        const autojoin = screen.getByTestId('autojoin')
        const hideUserJoinLeaveEvents = screen.getByTestId('hideUserJoinLeaveEvents')
        const toggleAutojoin = screen.getByTestId('toggleAutojoin')
        const toggleHideUserJoinLeaveEvents = screen.getByTestId('toggleHideUserJoinLeaveEvents')

        await waitFor(() => {
            expect(autojoin).toHaveTextContent('true')
        })
        await waitFor(() => {
            expect(hideUserJoinLeaveEvents).toHaveTextContent('false')
        })

        // toggle autojoin
        fireEvent.click(toggleAutojoin)
        await waitFor(() => {
            expect(autojoin).toHaveTextContent('false')
        })
        fireEvent.click(toggleHideUserJoinLeaveEvents)
        await waitFor(() => {
            expect(hideUserJoinLeaveEvents).toHaveTextContent('true')
        })
    })
})
