import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as Router from 'react-router'
import { TestApp } from 'test/testUtils'
import * as useSortedChannels from 'hooks/useSortedChannels'
import { TouchHome } from './TouchHome'

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId="some-stream-id">
                <TouchHome />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

const mockSpaceData: Lib.SpaceData = {
    id: 'some-stream-id',
    name: 'test space',
    avatarSrc: 'test',
    channelGroups: [
        {
            label: 'group 1',
            channels: [
                {
                    id: 'some-stream-id',
                    label: 'general',
                },
            ],
        },
    ],
    membership: '',
    isLoadingChannels: false,
    hasLoadedMemberships: false,
}

describe('<TouchHome />', () => {
    test('renders channel list when joined', async () => {
        // <TouchHome /> mock
        vi.spyOn(Lib, 'useSpaceData').mockImplementation(() => {
            return mockSpaceData
        })

        vi.spyOn(useSortedChannels, 'useSortedChannels').mockImplementation(() => {
            return {
                readChannels: [
                    {
                        type: 'channel' as const,
                        id: 'some-stream-id',
                        label: 'general',
                        search: '',
                        channel: {
                            id: 'some-stream-id',
                            label: 'general',
                        },
                        mentionCount: 0,
                        unread: false,
                        joined: true,
                        latestMs: 0,
                    },
                ],
                readDms: [],
                unreadChannels: [],
                unjoinedChannels: [],
                dmItems: [],
                channelItems: [],
            }
        })

        render(<Wrapper />)

        // check the channel list is rendered
        await waitFor(() => {
            expect(screen.getByText('general')).toBeInTheDocument()
        })

        expect(screen.queryByTestId('timeline-shimmer')).not.toBeInTheDocument()
    })
})
