/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import { Membership } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
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
import { Permission } from '@river/web3'
import { ZTEvent } from '../../src/types/timeline-types'
import { TSigner } from '../../src/types/web3-types'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('messageHistoryHooks', () => {
    test(
        "user's timeline is updated with correct history via scrollback()",
        async () => {
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
            ])) as string
            // create a channel
            const channelId = (await createTestChannelWithSpaceRoles(bob, {
                name: 'bobs channel',
                parentSpaceId: spaceId,
                roleIds: [],
            })) as string
            //
            // send 15 messages, make block every 5
            const NUM_MESSAGES = 15
            for (let i = 0; i < NUM_MESSAGES; i++) {
                await bob.sendMessage(channelId, `message ${i}`)
                if (i % 5 === 0) {
                    await bob.casablancaClient?.debugForceMakeMiniblock(channelId, {
                        forceSnapshot: true,
                    })
                }
            }

            // create a veiw for alice
            const TestComponent = ({ signer }: { signer: TSigner }) => {
                const { scrollback } = useZionClient()
                const { timeline } = useChannelTimeline()
                const messages = timeline.filter((x) => x.content?.kind === ZTEvent.RoomMessage)
                const onClickScrollback = useCallback(() => {
                    void (async () => {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            const result = await scrollback(channelId, 30)
                            if (!result || result.terminus) {
                                break
                            }
                        }
                    })()
                }, [scrollback])
                return (
                    <>
                        <RegisterAndJoinSpace
                            spaceId={spaceId}
                            channelId={channelId}
                            signer={signer}
                        />
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
                            <TestComponent signer={aliceProvider.wallet} />
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
            await waitFor(() => expect(+messageslength.textContent!).toBeLessThan(NUM_MESSAGES))
            const firstCount = +messageslength.textContent!
            // have bob send a message to jane
            fireEvent.click(scrollbackButton)
            // expect it to render as well
            await waitFor(() => expect(allMessages).not.toHaveTextContent('m.room.encrypted'))
            await waitFor(
                () => expect(+messageslength.textContent!).toBeGreaterThan(firstCount),
                TestConstants.DecaDefaultWaitForTimeout,
            )
            await waitFor(() => expect(+messageslength.textContent!).toEqual(NUM_MESSAGES))
        },
        TestConstants.DecaDefaultWaitForTimeout.timeout! * 4,
    )
})
