import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import * as Router from 'react-router'
import { TestApp } from 'test/testUtils'
import * as useContractAndServerSpaceDataHook from 'hooks/useContractAndServerSpaceData'
import { TouchHome } from './TouchHome'

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
                <TouchHome />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

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

describe('<TouchHome />', () => {
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

    test('renders channel list when joined', async () => {
        // <TouchHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return mockSpaceData
        })

        // <CheckValidSpaceOrInvite /> mock
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
                chainSpace: mockChainSpace,
                serverSpace: { ...mockSpaceData, membership: Lib.Membership.Join },
            }
        })

        render(<Wrapper />)

        // check the channel list is rendered
        await waitFor(() => {
            expect(screen.getByText('group 1')).toBeInTheDocument()
        })

        expect(screen.queryByTestId('timeline-shimmer')).not.toBeInTheDocument()
    })

    test('shows not found message when town does not exist', async () => {
        // <CheckValidSpaceOrInvite /> mock
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
