/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { LoginStatus } from '../../src/hooks/login'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { useRoom } from '../../src/hooks/use-room'
import { Membership, RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useWeb3Context } from '../../src/components/Web3ContextProvider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('defaultSpaceIdHooks', () => {
    jest.setTimeout(60000)
    test('new user sees default space information', async () => {
        // create clients
        const { jane } = await registerAndStartClients(['jane'])
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // create a space
        const defaultSpaceId = await jane.createSpace({
            name: 'janes space',
            visibility: RoomVisibility.Public,
        })
        //
        await jane.createChannel({
            name: 'janes channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: defaultSpaceId,
        })
        // create a veiw for bob
        const TestDefaultRoom = () => {
            const { isConnected } = useWeb3Context()
            const { loginStatus, loginError } = useMatrixStore()
            const { registerWallet, joinRoom, clientRunning } = useZionClient()
            const defaultSpace = useSpaceData()
            const defaultRoom = useRoom(defaultSpaceId)
            const myMembership = useMyMembership(defaultSpaceId)
            const onClickRegisterWallet = useCallback(() => {
                void registerWallet('...')
            }, [registerWallet])
            const onClickJoinRoom = useCallback(() => {
                void joinRoom(defaultSpaceId)
            }, [joinRoom])
            return (
                <>
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <button onClick={onClickRegisterWallet}>Register</button>
                    <div data-testid="spaceRoomName">
                        {defaultRoom ? defaultRoom?.name : 'undefined'}
                    </div>
                    <div data-testid="spaceName">
                        {defaultSpace ? defaultSpace?.name : 'undefined'}
                    </div>
                    <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
                    <button onClick={onClickJoinRoom}>Join</button>
                    <div data-testid="roomMembership"> {defaultRoom?.membership} </div>
                    <div data-testid="spaceMembership"> {defaultSpace?.membership} </div>
                    <div data-testid="myMembership"> {myMembership} </div>
                    <div data-testid="channelsCount">
                        {`${defaultSpace?.channelGroups.length ?? -1}`}
                    </div>
                    <div data-testid="channelName">
                        {' '}
                        {defaultSpace && defaultSpace.channelGroups.length > 0
                            ? defaultSpace.channelGroups[0].channels[0].label
                            : ''}{' '}
                    </div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp
                provider={bobProvider}
                defaultSpaceId={defaultSpaceId.matrixRoomId}
                defaultSpaceName="janes space (fake default)"
            >
                <SpaceContextProvider spaceId={undefined}>
                    <TestDefaultRoom />
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        const clientRunning = screen.getByTestId('clientRunning')
        const spaceRoomName = screen.getByTestId('spaceRoomName')
        const spaceName = screen.getByTestId('spaceName')
        const roomMembership = screen.getByTestId('roomMembership')
        const spaceMembership = screen.getByTestId('spaceMembership')
        const channelsCount = screen.getByTestId('channelsCount')
        const channelName = screen.getByTestId('channelName')

        const registerButton = screen.getByRole('button', { name: 'Register' })
        const joinButton = screen.getByRole('button', { name: 'Join' })
        // wait for our wallet to get unlocked
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        // click the register button
        fireEvent.click(registerButton)
        // expect our status to change to logged in
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // wait for the client to boot up, this is async
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // expect our default space to sync, even though we haven't joined it
        await waitFor(() => expect(spaceName).toHaveTextContent('janes space (fake default)'))
        // expect our room membership to be empty
        expect(roomMembership).toHaveTextContent('')
        expect(spaceMembership).toHaveTextContent('')
        // click the register button
        fireEvent.click(joinButton)
        // expect our room membership to be populated
        await waitFor(() => expect(roomMembership).toHaveTextContent(Membership.Join))
        await waitFor(() => expect(spaceMembership).toHaveTextContent(Membership.Join))
        // expect our default room to sync
        await waitFor(() => expect(spaceRoomName).toHaveTextContent('janes space'))
        // expect our default space to sync
        await waitFor(() => expect(spaceName).toHaveTextContent('janes space'))
        // check for public channels...
        await waitFor(() => expect(channelsCount).toHaveTextContent('1'))
        await waitFor(() => expect(channelName).toHaveTextContent('janes channel'))
    })
})
