/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React, { useState } from 'react'
import { Permission } from '@river-build/web3'
import { ChannelContextProvider } from '../../src/components/ChannelContextProvider'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { useChannelTimeline } from '../../src/hooks/use-channel-timeline'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { Membership } from '../../src/types/towns-types'
import { TimelineEvent } from '../../src/types/timeline-types'
import { LoginWithWallet, RegisterAndJoinSpace } from './helpers/TestComponents'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { TownsTestApp } from './helpers/TownsTestApp'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { TestConstants } from './helpers/TestConstants'

describe('encryptionDecrypt', () => {
    test('can decrypt previously read messages after logging out and then logging back in', async () => {
        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        await jane.fundWallet()
        // create a wallet for bob
        const bobProvider = new TownsTestWeb3Provider()

        // create a space
        const janesSpaceId = await createTestSpaceGatedByTownNft(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes_space'),
            },
        )
        //
        const janesChannelId = await createTestChannelWithSpaceRoles(jane, {
            name: 'janes_channel',
            parentSpaceId: janesSpaceId,
            roleIds: [],
        })

        // create a veiw for bob
        const TestRoomMessages = () => {
            const { sendMessage, logout } = useTownsClient()

            const [isRegistration, setIsRegistration] = useState(true)
            const [isLoggingBackIn, setIsLoggingBackIn] = useState(false)

            const { timeline } = useChannelTimeline()

            function onLogout() {
                setIsRegistration(false)
                void logout()
            }

            function onLogin() {
                console.log('!!login')
                setIsLoggingBackIn(true)
            }

            // format for easy reading
            function formatMessage(e: TimelineEvent) {
                return `${e.fallbackContent} eventId: ${e.eventId}`
            }
            return (
                <>
                    {isRegistration && (
                        <div data-testid="registrationWrapper">
                            <RegisterAndJoinSpace
                                spaceId={janesSpaceId}
                                channelId={janesChannelId}
                            />
                        </div>
                    )}
                    {isLoggingBackIn && (
                        <div data-testid="loginWrapper">
                            <LoginWithWallet />
                        </div>
                    )}
                    <button onClick={() => void sendMessage(janesChannelId, 'hello jane')}>
                        Send Message
                    </button>
                    <div data-testid="allMessages">
                        {timeline.map((event) => formatMessage(event)).join('\n')}
                    </div>
                    <button data-testid="logout" onClick={onLogout}>
                        logout
                    </button>
                    <button data-testid="login" onClick={onLogin}>
                        login
                    </button>
                </>
            )
        }
        // render it
        render(
            <TownsTestApp provider={bobProvider}>
                <SpaceContextProvider spaceId={janesSpaceId}>
                    <ChannelContextProvider channelId={janesChannelId}>
                        <TestRoomMessages />
                    </ChannelContextProvider>
                </SpaceContextProvider>
            </TownsTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const channelMembership = screen.getByTestId('channelMembership')
        const allMessages = screen.getByTestId('allMessages')
        const regWrapper = screen.getByTestId('registrationWrapper')

        const sendMessageButton = screen.getByRole('button', {
            name: 'Send Message',
        })

        const logoutButton = screen.getByRole('button', {
            name: 'logout',
        })
        const loginButton = screen.getByRole('button', {
            name: 'login',
        })

        // wait for client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // wait for the channel join
        await waitFor(
            () => expect(channelMembership).toHaveTextContent(Membership.Join),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // have bob send a message to jane
        fireEvent.click(sendMessageButton)

        // expect jane to recieve the message
        await waitFor(
            () => expect(jane.getMessages(janesChannelId)).toContain('hello jane'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // expect to render
        await waitFor(() => expect(allMessages).toHaveTextContent('hello jane'))

        fireEvent.click(logoutButton)
        await waitFor(() => expect(regWrapper).not.toBeInTheDocument())
        await waitFor(() => expect(allMessages).toHaveTextContent(''))

        fireEvent.click(loginButton)

        await screen.findByTestId('loginWrapper')
        await waitFor(() => expect(allMessages).toHaveTextContent('hello jane'))

        screen.debug(undefined, Infinity)
    })
})
