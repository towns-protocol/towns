import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { TestApp } from 'test/testUtils'
import * as useContractAndServerSpaceDataHook from 'hooks/useContractAndServerSpaceData'
import { SpaceHome } from './SpaceHome'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider
                spaceId={{
                    protocol: Lib.SpaceProtocol.Matrix,
                    slug: 'some-slug',
                    networkId: 'some-network',
                }}
            >
                <SpaceHome />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

describe('<SpaceHome />', () => {
    test('renders timeline shimmer when no server space or contract space', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                serverSpace: undefined,
            }
        })
        render(<Wrapper />)
        expect(screen.getByTestId('timeline-shimmer')).toBeInTheDocument()
    })

    test('renders join space UI when contract space exists but server space does not', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: {
                    address: '0x1',
                    networkId: 'some-id',
                    name: 'some-name',
                    owner: '0x0',
                    disabled: false,
                },
                serverSpace: undefined,
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-join')).toBeInTheDocument()
        })

        expect(screen.getByTestId('timeline-shimmer')).toBeInTheDocument()
    })

    test('renders join space from invite link UI when contract space exists but server space does not', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: {
                    address: '0x1',
                    networkId: 'some-id',
                    name: 'some-name',
                    owner: '0x0',
                    disabled: false,
                },
                serverSpace: undefined,
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-join')).toBeInTheDocument()
        })

        expect(screen.getByTestId('timeline-shimmer')).toBeInTheDocument()
    })

    test('renders join button when default space exists', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                serverSpace: {
                    id: {
                        protocol: Lib.SpaceProtocol.Matrix,
                        slug: 'some-slug',
                        networkId: 'some-network',
                    },
                    name: 'test space',
                    avatarSrc: 'test',
                    channelGroups: [],
                    membership: '',
                },
            }
        })

        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByText('test space')).toBeInTheDocument()
        })

        expect(screen.queryByTestId('timeline-shimmer')).not.toBeInTheDocument()
    })

    test('routes to spaces/:id/threads when no channel groups', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                serverSpace: {
                    id: {
                        protocol: Lib.SpaceProtocol.Matrix,
                        slug: 'some-slug',
                        networkId: 'some-network',
                    },
                    name: 'test space',
                    avatarSrc: 'test',
                    channelGroups: [],
                    membership: Lib.Membership.Join,
                },
            }
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith('/spaces/some-slug/threads')
            },
            {
                timeout: 4000,
            },
        )
    })

    test('routes to first channel when channels exist', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                serverSpace: {
                    id: {
                        protocol: Lib.SpaceProtocol.Matrix,
                        slug: 'some-slug',
                        networkId: 'some-network',
                    },
                    name: 'test space',
                    avatarSrc: 'test',
                    channelGroups: [
                        {
                            label: 'group 1',
                            channels: [
                                {
                                    id: {
                                        protocol: Lib.SpaceProtocol.Matrix,
                                        slug: 'some-channel-slug',
                                        networkId: 'some-network',
                                    },
                                    label: 'channel 1',
                                },
                            ],
                        },
                    ],
                    membership: Lib.Membership.Join,
                },
            }
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    '/spaces/some-slug/channels/some-channel-slug/',
                )
            },
            {
                timeout: 4000,
            },
        )
    })
})
