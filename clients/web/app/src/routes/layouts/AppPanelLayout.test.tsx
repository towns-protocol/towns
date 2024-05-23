import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { TestApp } from 'test/testUtils'
import { AppPanelLayout } from './AppPanelLayout'

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId="some-stream-id">
                <AppPanelLayout />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
})

describe('<AppPanelLayout />', () => {
    beforeEach(() => {
        vi.mock('hooks/useUnseenChannelIdsCount', () => ({
            useUnseenChannelIds: () => ({
                unseenChannelIds: new Set([]),
                markChannelsAsSeen: jest.fn(),
            }),
        }))
    })

    test('renders SpaceSideBar when a server space exists', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return {
                id: 'some-stream-id',
                name: 'test',
                avatarSrc: 'test',
                channelGroups: [],
                membership: '',
                isLoadingChannels: false,
                hasLoadedMemberships: false,
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('space-sidebar')).toBeInTheDocument()
        })
    })

    test('renders app version and commit hash in SpaceSideBar', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return {
                id: 'some-stream-id',
                name: 'test',
                avatarSrc: 'test',
                channelGroups: [],
                membership: '',
                isLoadingChannels: false,
                hasLoadedMemberships: false,
            }
        })
        render(<Wrapper />)

        await waitFor(() => {
            screen.getByText(/1.2.3/gi)
            screen.getByText(/aabbccdd/gi)
        })
    })

    test('renders channel shimmer when a server space does not exist', async () => {
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return undefined
        })
        render(<Wrapper />)

        await waitFor(() => {
            expect(screen.getByTestId('channel-shimmer')).toBeInTheDocument()
        })
    })
})
