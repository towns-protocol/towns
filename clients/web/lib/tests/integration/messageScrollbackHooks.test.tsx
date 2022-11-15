import { Membership, RoomVisibility } from '../../src/types/matrix-types'
/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginWithAuth } from './helpers/TestComponents'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('messageScrollbackHooks', () => {
    jest.setTimeout(60000)
    test('user can join a room, see messages, and send messages', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
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
            roleIds: [],
        })
        //
        await alice.joinRoom(spaceId)
        await alice.joinRoom(channelId)
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }
        // stop alice
        alice.stopClient()
        // create a veiw for alice
        const TestComponent = () => {
            const { scrollback } = useZionClient()
            const timeline = useChannelTimeline()
            const mySpaceMembership = useMyMembership(spaceId)
            const onClickScrollback = useCallback(() => {
                void scrollback(channelId, 30)
            }, [scrollback])
            return (
                <>
                    <LoginWithAuth auth={alice.auth!} />
                    <div data-testid="spaceMembership"> {mySpaceMembership} </div>
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
            <ZionTestApp provider={alice.provider}>
                <SpaceContextProvider spaceId={spaceId}>
                    <ChannelContextProvider channelId={channelId}>
                        <TestComponent />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const spaceMembership = screen.getByTestId('spaceMembership')
        const messageslength = screen.getByTestId('messageslength')
        const scrollbackButton = screen.getByRole('button', {
            name: 'Scrollback',
        })
        // wait for the channel join
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join))
        // expect our message to show
        await waitFor(() => expect(messageslength).toHaveTextContent('20'))
        // have bob send a message to jane
        fireEvent.click(scrollbackButton)
        // expect it to render as well
        await waitFor(() => expect(messageslength).toHaveTextContent('34'))
    })
})
