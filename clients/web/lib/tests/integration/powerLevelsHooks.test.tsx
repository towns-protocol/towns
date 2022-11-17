/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { registerAndStartClients } from './helpers/TestUtils'
import { usePowerLevels } from '../../src/hooks/use-power-levels'
import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import { LoginStatus } from '../../src/hooks/login'
import { sleep } from '../../src/utils/zion-utils'

describe('powerLevelsHooks', () => {
    jest.setTimeout(40000)
    test('create a space with two users, reduce the level required to create a space child', async () => {
        // create clients
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // bob creates a room
        const roomId = await bob.createSpace({
            name: "bob's space",
            visibility: RoomVisibility.Private,
        })
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.matrixUserId!)
        // alice joins the room
        await alice.joinRoom(roomId)
        // stop bob
        bob.stopClient()
        await sleep(50)
        // create a power levels view for bob
        const PowerLevelContent = (props: { roomId: RoomIdentifier }) => {
            const { loginStatus, loginError } = useMatrixStore()
            const { loginWithWallet, setPowerLevel } = useZionClient()
            const powerLevels = usePowerLevels(props.roomId)
            const spaceChildLevel = powerLevels.levels.find(
                (x) => x.definition.key == 'm.space.child',
            )
            // callback to set the level required to create a space child to 0
            const updateSpaceChildLevel = useCallback(() => {
                if (!spaceChildLevel) {
                    throw new Error('no space child level found')
                }
                void setPowerLevel(props.roomId, spaceChildLevel, 0)
            }, [spaceChildLevel, props.roomId, setPowerLevel])
            // effect to log in
            useEffect(() => {
                void loginWithWallet('login...')
            }, [loginWithWallet])
            // content
            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="spaceChildLevel">
                        {'_' + (spaceChildLevel?.value.toString() ?? 'none') + '_'}
                    </div>
                    <button onClick={updateSpaceChildLevel}>PowerDown</button>
                </>
            )
        }

        render(
            <ZionTestApp provider={bob.provider}>
                <PowerLevelContent roomId={roomId} />
            </ZionTestApp>,
        )
        // expect our status to change to logged in
        const loginStatus = screen.getByTestId('loginStatus')
        const spaceChildLevel = screen.getByTestId('spaceChildLevel')
        const powerDownButton = screen.getByRole('button', { name: 'PowerDown' })
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // expect the initial power levels to be set to 50
        await waitFor(() => expect(spaceChildLevel).toHaveTextContent('_50_'))
        // expect that alice can't make a space child
        await expect(
            alice.createChannel({
                name: "alice's channel",
                visibility: RoomVisibility.Private,
                parentSpaceId: roomId,
                roleIds: [],
            }),
        ).rejects.toThrow('is not allowed to send event. 0 < 50')
        // set update the power level to 0
        fireEvent.click(powerDownButton)
        // expect the power level to change
        await waitFor(() => expect(spaceChildLevel).toHaveTextContent('_0_'))
        // expect alice to see the power level change
        await waitFor(() => expect(alice.getPowerLevel(roomId, 'm.space.child')?.value).toEqual(0))
        // expect that alice can make a space child
        await expect(
            alice.createChannel({
                name: "alice's channel",
                visibility: RoomVisibility.Private,
                parentSpaceId: roomId,
                roleIds: [],
            }),
        ).resolves.toBeDefined()
    })
})
