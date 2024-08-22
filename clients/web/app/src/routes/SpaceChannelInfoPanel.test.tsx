import 'fake-indexeddb/auto'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import { roleDataWithBothRolesAssignedToChannel } from 'test/testMocks'
import { ChannelInfoPanel } from './SpaceChannelInfoPanel'

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    return {
        ...actual,
        useChannelData: (): ReturnType<typeof Lib.useChannelData> => ({
            channel: {
                id: 'channelId',
                label: 'my-channel',
            },
            channelId: 'channelId',
            spaceId: 'spaceId',
        }),
        useChannelMembers: (): ReturnType<typeof Lib.useChannelMembers> => ({
            memberIds: ['0x123'],
        }),
        useRoom: (channelId: string): ReturnType<typeof Lib.useRoom> => ({
            id: channelId,
            name: 'my-channel',
            topic: 'Room Topic',
            members: ['0x123'],
            membership: 'join',
            isSpaceRoom: false,
            isDefault: false,
            isAutojoin: false,
            hideUserJoinLeaveEvents: false,
        }),
        useConnectivity: (): ReturnType<typeof Lib.useConnectivity> => ({
            ...actual.useConnectivity(),
            loggedInWalletAddress: '0x123',
        }),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId="spaceId">
                <ChannelInfoPanel />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<SpaceChannelInfoPanel />', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.mock('framer-motion', async () => {
            return {
                AnimatePresence: ({ children }: { children: JSX.Element }) => children,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                motion: (c: any) => c,
            }
        })

        vi.mock('ui/styles/atoms.css', () => ({
            atoms: Object.assign(() => {}, {
                properties: new Set([]),
            }),
            boxClass: '',
            containerWithGapClass: '',
        }))
    })

    test('renders correct basic details for unjoined channels', async () => {
        render(<Wrapper />)

        expect(screen.getByText('#my-channel')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
        expect(screen.getByText('Room Topic')).toBeInTheDocument()
        expect(screen.getByText('1 member')).toBeInTheDocument()
    })

    test('renders correct basic details for joined channels', async () => {
        render(<Wrapper />)

        expect(screen.getByText('#my-channel')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
        expect(screen.getByText('Room Topic')).toBeInTheDocument()
        expect(screen.getByText('1 member')).toBeInTheDocument()
        expect(screen.getByText('Mute #my-channel')).toBeInTheDocument()
        expect(screen.getByText('Leave #my-channel')).toBeInTheDocument()
    })

    test('renders edit channel settings button if user has channel permissions', async () => {
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
            invalidate: async () => {},
            getQueryData: () => undefined,
        })

        render(<Wrapper />)

        expect(screen.getByTestId('edit-channel-settings-button')).toBeInTheDocument()
    })

    test('renders channel permission details if gated role applied to channel', async () => {
        const [, gatedRole] = roleDataWithBothRolesAssignedToChannel
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: false,
            error: undefined,
            invalidate: async () => {},
            getQueryData: () => undefined,
        })

        vi.spyOn(Lib, 'useChannelSettings').mockReturnValue({
            isLoading: false,
            error: undefined,
            channelSettings: {
                spaceNetworkId: 'spaceId',
                channelNetworkId: 'channelId',
                name: 'my-channel',
                disabled: false,
                roles: [
                    {
                        roleId: 4,
                        name: 'my-channel',
                        permissions: ['Read'],
                        users: [],
                        ruleData: gatedRole.ruleData,
                    },
                ],
                description: 'some description',
            },
        })

        render(<Wrapper />)

        expect(screen.getByTestId('channel-permission-details')).toBeInTheDocument()
        expect(
            screen.queryByTestId('channel-permission-details-edit-button'),
        ).not.toBeInTheDocument()
    })

    test('renders edit channel button within channel permission details', async () => {
        vi.spyOn(Lib, 'useHasPermission').mockReturnValue({
            isLoading: false,
            hasPermission: true,
            error: undefined,
            invalidate: async () => {},
            getQueryData: () => undefined,
        })

        const [, gatedRole] = roleDataWithBothRolesAssignedToChannel

        vi.spyOn(Lib, 'useChannelSettings').mockReturnValue({
            isLoading: false,
            error: undefined,
            channelSettings: {
                spaceNetworkId: 'spaceId',
                channelNetworkId: 'channelId',
                name: 'my-channel',
                disabled: false,
                roles: [
                    {
                        roleId: 4,
                        name: 'my-channel',
                        permissions: ['Read'],
                        users: [],
                        ruleData: gatedRole.ruleData,
                    },
                ],
                description: 'some description',
            },
        })

        render(<Wrapper />)

        expect(screen.getByTestId('channel-permission-details-edit-button')).toBeInTheDocument()
    })
})
