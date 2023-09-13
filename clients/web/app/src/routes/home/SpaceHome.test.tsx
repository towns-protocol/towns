import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { PATHS } from 'routes'
import { TestApp } from 'test/testUtils'
import * as useContractAndServerSpaceDataHook from 'hooks/useContractAndServerSpaceData'
import { SpaceHome } from './SpaceHome'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

const mockSpaceData: Lib.SpaceData = {
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
                    label: 'general',
                },
            ],
        },
    ],
    membership: '',
    isLoadingChannels: false,
}

const mockChainSpace = {
    address: '0x1',
    networkId: 'some-id',
    name: 'some-name',
    owner: '0x0',
    disabled: false,
}

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
    test('renders join space UI when it is an invite link', async () => {
        vi.spyOn(Router, 'useLocation').mockReturnValue({
            search: '?invite',
            state: undefined,
            key: '',
            pathname: '',
            hash: '',
        })

        // <CheckValidSpaceOrInvite /> mock
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
                chainSpace: mockChainSpace,
                serverSpace: mockSpaceData,
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-join')).toBeInTheDocument()
        })

        expect(screen.getByTestId('timeline-shimmer')).toBeInTheDocument()
    })

    test('routes to spaces/:id/threads when no channel groups', async () => {
        const serverSpaceData = {
            ...mockSpaceData,
            channelGroups: [],
            membership: Lib.Membership.Join,
        }
        // <SpaceHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return serverSpaceData
        })
        // <CheckValidSpaceOrInvite /> mock
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
                chainSpace: mockChainSpace,
                serverSpace: serverSpaceData,
            }
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(`/${PATHS.SPACES}/some-slug/threads/`)
            },
            {
                timeout: 4000,
            },
        )
    })

    test('routes to first channel when channels exist', async () => {
        const serverSpaceData = {
            ...mockSpaceData,
            membership: Lib.Membership.Join,
        }
        // <SpaceHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return serverSpaceData
        })

        // <CheckValidSpaceOrInvite /> mock
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
                chainSpace: mockChainSpace,
                serverSpace: serverSpaceData,
            }
        })

        const navigateSpy = vi.fn()
        vi.spyOn(Router, 'useNavigate').mockReturnValue((args) => navigateSpy(args))

        render(<Wrapper />)

        await waitFor(
            () => {
                expect(navigateSpy).toHaveBeenCalledWith(
                    `/${PATHS.SPACES}/some-slug/channels/some-channel-slug/`,
                )
            },
            {
                timeout: 4000,
            },
        )
    })

    test('shows not found message when town does not exist', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
                chainSpace: undefined,
                serverSpace: undefined,
            }
        })

        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByText(/town not found/gi)).toBeInTheDocument()
        })
    })
})
