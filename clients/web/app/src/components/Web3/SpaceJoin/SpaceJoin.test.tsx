import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import { TestApp } from 'test/testUtils'
import { Props, SpaceJoin } from './SpaceJoin'

const joinRoomSpy = vi.fn()

vi.mock('use-zion-client', async () => {
    const actual = (await vi.importActual('use-zion-client')) as typeof Lib
    return {
        ...actual,
        useZionClient: () => {
            return {
                ...actual.useZionClient(),
                client: {
                    matrixClient: {
                        isInitialSyncComplete: () => true,
                    },
                },
                joinRoom: joinRoomSpy,
            }
        },
    }
})

const Wrapper = (props: Props) => {
    return (
        <TestApp>
            <SpaceJoin
                joinData={props.joinData}
                onCancel={props.onCancel}
                onSuccessfulJoin={props.onSuccessfulJoin}
            />
        </TestApp>
    )
}

describe('<SpaceJoin />', () => {
    test('it renders join modal with space name on load', async () => {
        render(<Wrapper joinData={{ name: 'doodles', networkId: 'doodles-id' }} />)
        await waitFor(() => {
            expect(screen.getByText('Join doodles')).toBeInTheDocument()
        })
    })

    test('it successfully joins room after clicking join button', async () => {
        joinRoomSpy.mockReturnValueOnce(
            Promise.resolve({
                id: {
                    protocol: Lib.SpaceProtocol.Matrix,
                    slug: 'some-slug',
                    networkId: 'some-network',
                },
                name: 'doodles',
                membership: Lib.Membership.Join,
                members: [
                    {
                        userId: 'user-id',
                        name: 'username',
                        membership: Lib.Membership.Join,
                    },
                ],
                membersMap: {},
                isSpaceRoom: true,
            }),
        )

        const onSuccessfulJoinSpy = vi.fn()

        render(
            <Wrapper
                joinData={{ name: 'doodles', networkId: 'doodles-id' }}
                onSuccessfulJoin={onSuccessfulJoinSpy}
            />,
        )

        const joinButton = await screen.findByText('Join doodles')
        fireEvent.click(joinButton)

        await waitFor(() => {
            expect(joinRoomSpy).toHaveBeenCalledWith({
                networkId: 'doodles-id',
                protocol: 'matrix',
                slug: 'doodles-id',
            })
        })

        await waitFor(() => {
            expect(onSuccessfulJoinSpy).toHaveBeenCalled()
        })
    })

    test('it shows failed to join message if unable to join room', async () => {
        joinRoomSpy.mockReturnValueOnce(undefined)

        const onSuccessfulJoinSpy = vi.fn()

        render(
            <Wrapper
                joinData={{ name: 'doodles', networkId: 'doodles-id' }}
                onSuccessfulJoin={onSuccessfulJoinSpy}
            />,
        )

        const joinButton = await screen.findByText('Join doodles')
        fireEvent.click(joinButton)

        await waitFor(() => {
            expect(joinRoomSpy).toHaveBeenCalledWith({
                networkId: 'doodles-id',
                protocol: 'matrix',
                slug: 'doodles-id',
            })
        })

        expect(onSuccessfulJoinSpy).not.toHaveBeenCalled()
        await waitFor(() => {
            expect(screen.getByText(/You don't have permission/gi)).toBeInTheDocument()
        })
    })
})
