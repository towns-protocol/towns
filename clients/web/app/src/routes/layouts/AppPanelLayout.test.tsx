import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import * as Lib from 'use-zion-client'
import { TestApp } from 'test/testUtils'
import * as useContractAndServerSpaceDataHook from 'hooks/useContractAndServerSpaceData'
import { AppPanelLayout } from './AppPanelLayout'

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
                <AppPanelLayout />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
})

describe('<AppPanelLayout />', () => {
    test('renders SpaceSideBar when a server space exists', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                chainSpaceLoading: false,
                serverSpace: {
                    id: {
                        protocol: Lib.SpaceProtocol.Matrix,
                        slug: 'some-slug',
                        networkId: 'some-network',
                    },
                    name: 'test',
                    avatarSrc: 'test',
                    channelGroups: [],
                    membership: '',
                    isLoadingChannels: false,
                },
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-sidebar')).toBeInTheDocument()
        })
    })

    test('renders app version and commit hash in SpaceSideBar', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpace: undefined,
                chainSpaceLoading: false,
                serverSpace: {
                    id: {
                        protocol: Lib.SpaceProtocol.Matrix,
                        slug: 'some-slug',
                        networkId: 'some-network',
                    },
                    name: 'test',
                    avatarSrc: 'test',
                    channelGroups: [],
                    membership: '',
                    isLoadingChannels: false,
                },
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            screen.getByText(/1.2.3/gi)
            screen.getByText(/aabbccdd/gi)
        })
    })

    test('renders channel shimmer when a server space does not exist', async () => {
        vi.spyOn(
            useContractAndServerSpaceDataHook,
            'useContractAndServerSpaceData',
        ).mockImplementation(() => {
            return {
                chainSpaceLoading: false,
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
            expect(screen.getByTestId('channel-shimmer')).toBeInTheDocument()
        })
    })
})
