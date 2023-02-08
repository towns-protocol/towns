/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Membership, RoomVisibility } from '../../src/types/zion-types'
import React, { useCallback } from 'react'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LoginStatus } from '../../src/hooks/login'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useMyMembership } from '../../src/hooks/use-my-membership'
import { useRoom } from '../../src/hooks/use-room'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { useWeb3Context } from '../../src/components/Web3ContextProvider'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('defaultSpaceIdHooks', () => {
    test('new user sees default space information', async () => {
        // create clients
        // create a wallet for bob
        const bobProvider = new ZionTestWeb3Provider()
        // create a space
        const { jane } = await registerAndStartClients(['jane'])
        // jane needs funds to create a space
        await jane.fundWallet()
        const defaultSpaceId = (await createTestSpaceWithEveryoneRole(
            jane,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('janes space'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        //
        await createTestChannelWithSpaceRoles(jane, {
            name: makeUniqueName('janes channel'),
            parentSpaceId: defaultSpaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
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
                defaultSpaceId={defaultSpaceId.networkId}
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
