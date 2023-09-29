/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group dendrite
 * @group casablanca
 */
import { Membership, RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    getPrimaryProtocol,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { TestConstants } from './helpers/TestConstants'
import { sleep } from '../../src/utils/zion-utils'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { Permission } from '@river/web3'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('messageHistoryHooks', () => {
    test(
        "user's timeline is updated with correct history via scrollback()",
        async () => {
            if (getPrimaryProtocol() !== SpaceProtocol.Casablanca) {
                console.log('skipping test for matrix protocol')
                return
            }
            // create client
            // create alice provider
            const aliceProvider = new ZionTestWeb3Provider()
            await aliceProvider.fundWallet()
            const { bob } = await registerAndStartClients(['bob'])
            // bob needs funds to create a space
            await bob.fundWallet()
            // create a space
            const spaceId = (await createTestSpaceGatedByTownNft(bob, [
                Permission.Read,
                Permission.Write,
            ])) as RoomIdentifier
            // create a channel
            const channelId = (await createTestChannelWithSpaceRoles(bob, {
                name: 'bobs channel',
                parentSpaceId: spaceId,
                visibility: RoomVisibility.Public,
                roleIds: [],
                streamSettings: { miniblockTimeMs: 1000n, minEventsPerSnapshot: 5 },
            })) as RoomIdentifier
            //
            // send 15 messages, five first, then 10 more
            for (let i = 0; i < 5; i++) {
                await bob.sendMessage(channelId, `message ${i}`)
            }

            await sleep(2 * 1000) // we make miniblocks every 1 seconds, give it a bit of time to make a miniblock

            for (let i = 5; i < 15; i++) {
                await bob.sendMessage(channelId, `message ${i}`)
            }

            // create a veiw for alice
            const TestComponent = () => {
                const { scrollback } = useZionClient()
                const { timeline } = useChannelTimeline()
                const messages = timeline.filter((x) => x.content?.kind === 'm.room.message')
                const onClickScrollback = useCallback(() => {
                    void scrollback(channelId, 30)
                }, [scrollback])
                return (
                    <>
                        <RegisterAndJoinSpace spaceId={spaceId} channelId={channelId} />
                        <button onClick={onClickScrollback}>Scrollback</button>
                        <div data-testid="messageslength">
                            {messages.length > 0 ? messages.length.toString() : 'empty'}
                        </div>
                        <div data-testid="allMessages">
                            {timeline.map((event) => event.fallbackContent).join('\n')}
                        </div>
                    </>
                )
            }
            // render it
            render(
                <ZionTestApp provider={aliceProvider}>
                    <SpaceContextProvider spaceId={spaceId}>
                        <ChannelContextProvider channelId={channelId}>
                            <TestComponent />
                        </ChannelContextProvider>
                    </SpaceContextProvider>
                </ZionTestApp>,
            )
            // get our test elements
            const spaceMembership = screen.getByTestId('spaceMembership')
            const channelMembership = screen.getByTestId('channelMembership')
            const messageslength = screen.getByTestId('messageslength')
            const allMessages = screen.getByTestId('allMessages')
            const scrollbackButton = screen.getByRole('button', {
                name: 'Scrollback',
            })
            // wait for the channel join
            await waitFor(
                () => expect(spaceMembership).toHaveTextContent(Membership.Join),
                TestConstants.DecaDefaultWaitForTimeout,
            )
            await waitFor(
                () => expect(channelMembership).toHaveTextContent(Membership.Join),
                TestConstants.DecaDefaultWaitForTimeout,
            )
            // expect our message to show
            await waitFor(
                () => expect(allMessages).not.toHaveTextContent('m.room.encrypted'),
                TestConstants.DecaDefaultWaitForTimeout,
            )
            await waitFor(() => expect(+messageslength.textContent!).toBeGreaterThan(0))
            await waitFor(() => expect(+messageslength.textContent!).toBeLessThanOrEqual(20))
            const firstCount = +messageslength.textContent!
            // have bob send a message to jane
            fireEvent.click(scrollbackButton)
            // expect it to render as well
            await waitFor(() => expect(allMessages).not.toHaveTextContent('m.room.encrypted'))
            await waitFor(
                () => expect(+messageslength.textContent!).toBeGreaterThan(firstCount),
                TestConstants.DecaDefaultWaitForTimeout,
            )
        },
        TestConstants.DecaDefaultWaitForTimeout.timeout! * 4,
    )
})
