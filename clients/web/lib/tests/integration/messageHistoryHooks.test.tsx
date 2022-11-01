import { Membership, RoomVisibility } from '../../src/types/matrix-types'
/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RegisterAndJoinSpace } from './helpers/TestComponents'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { act } from 'react-dom/test-utils'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe.skip('messageHistoryHooks', () => {
    jest.setTimeout(60000)
    test('user can join a room, see messages, and send messages', async () => {
        // create client
        const { bob } = await registerAndStartClients(['bob'])
        // create alice provider
        const aliceProvider = new ZionTestWeb3Provider()
        // create a space
        const spaceId = await bob.createSpace({
            name: 'bobs space',
            visibility: RoomVisibility.Public,
        })
        // create a channel
        const channelId = await bob.createChannel({
            name: 'bobs channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
        })
        //
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }
        act(() => {
            // create a veiw for alice
            const TestComponent = () => {
                const { scrollback } = useZionClient()
                const timeline = useChannelTimeline()
                const onClickScrollback = useCallback(() => {
                    void scrollback(channelId, 30)
                }, [scrollback])
                return (
                    <>
                        <RegisterAndJoinSpace spaceId={spaceId} channelId={channelId} />
                        <button onClick={onClickScrollback}>Scrollback</button>
                        <div data-testid="messageslength">
                            {timeline.length > 0 ? timeline.length.toString() : 'empty'}
                        </div>
                        <div id="allMessages">
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
        })
        // get our test elements
        const spaceMembership = screen.getByTestId('spaceMembership')
        const channelMembership = screen.getByTestId('spaceMembership')
        const messageslength = screen.getByTestId('messageslength')
        const scrollbackButton = screen.getByRole('button', {
            name: 'Scrollback',
        })
        // wait for the channel join
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join))
        await waitFor(() => expect(channelMembership).toHaveTextContent(Membership.Join))
        // expect our message to show
        await waitFor(() => expect(messageslength).toHaveTextContent('20'))
        // have bob send a message to jane
        fireEvent.click(scrollbackButton)
        // expect it to render as well
        await waitFor(() => expect(messageslength).toHaveTextContent('34'))
    })
})
