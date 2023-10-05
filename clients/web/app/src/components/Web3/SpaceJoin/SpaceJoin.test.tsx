import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
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
                    joinRoom: joinRoomSpy,
                },
            }
        },
        useZionContext: () => {
            return {
                ...actual.useZionContext(),
                matrixClient: {
                    isInitialSyncComplete: () => true,
                },
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

// need new tests https://linear.app/hnt-labs/issue/HNT-2729/need-new-tests-for-createspaceform-and-spacejoin
describe.skip('<SpaceJoin />', () => {
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
                slug: 'doodles-id',
            })
        })

        await waitFor(() => {
            expect(onSuccessfulJoinSpy).toHaveBeenCalled()
        })
    })

    test('it failed permission message if unable to join room because of invalid permissions', async () => {
        joinRoomSpy.mockRejectedValueOnce(Error('Invalid permissions'))

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
                slug: 'doodles-id',
            })
        })

        expect(onSuccessfulJoinSpy).not.toHaveBeenCalled()
        await waitFor(() => {
            expect(screen.getByText(/You don't have permission/gi)).toBeInTheDocument()
        })
    })

    test('it shows room limit message if unable to join room because of room limit', async () => {
        joinRoomSpy.mockRejectedValueOnce(Error('has exceeded the member cap'))

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
                slug: 'doodles-id',
            })
        })

        expect(onSuccessfulJoinSpy).not.toHaveBeenCalled()
        await waitFor(() => {
            expect(screen.getByText(/this town has reached its capacity./gi)).toBeInTheDocument()
        })
    })
})
