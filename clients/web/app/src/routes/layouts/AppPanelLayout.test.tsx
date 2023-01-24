import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { ResizeObserver } from '@juggle/resize-observer' // dependency of react-hook/resize-observer
import * as Lib from 'use-zion-client'
import { TestApp } from 'test/testUtils'
import * as useContractAndServerSpaceDataHook from 'hooks/useContractAndServerSpaceData'
import { AppPanelLayout } from './AppPanelLayout'

const Wrapper = () => {
    return (
        <TestApp>
            <AppPanelLayout />
        </TestApp>
    )
}

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
})

describe('<AppPanelLayout />', () => {
    test('renders register form when user needs onboarding', async () => {
        vi.spyOn(Lib, 'useZionContext').mockImplementationOnce(() => {
            return {
                ...Lib.useZionContext(),
                onboardingState: {
                    kind: 'user-profile',
                    bNeedsDisplayName: true,
                    bNeedsAvatar: true,
                },
            }
        })
        render(<Wrapper />)
        await waitFor(() => {
            expect(screen.getByTestId('register-form')).toBeInTheDocument()
        })
    })

    test('renders SpaceSideBar when a server space exists', async () => {
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
                    name: 'test',
                    avatarSrc: 'test',
                    channelGroups: [],
                    membership: '',
                },
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-sidebar')).toBeInTheDocument()
        })
    })

    test('renders channel shimmer when a server space does not exist', async () => {
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
            expect(screen.getByTestId('channel-shimmer')).toBeInTheDocument()
        })
    })
})
