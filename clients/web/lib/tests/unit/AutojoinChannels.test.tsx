/**
 * @group casablanca
 */

import { jest } from '@jest/globals'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { mockSpaceDataWith2Channels } from '../mocks/spaceData'

const joinRoomMock = jest.fn()
const getStreamMock = jest.fn<
    (streamId: string) => {
        getMemberships: () => {
            leftUsers: Set<string>
        }
    }
>()

/**
 * mock modules that are imported in AutojoinChannels.tsx
 */
jest.unstable_mockModule('../../src/hooks/use-space-data', () => ({
    useSpaceData: () => mockSpaceDataWith2Channels,
}))

jest.unstable_mockModule('../../src/hooks/use-zion-client', () => ({
    useZionClient: () => ({
        joinRoom: joinRoomMock,
    }),
}))

jest.unstable_mockModule('../../src/components/ZionContextProvider', () => ({
    useZionContext: () => ({
        casablancaClient: {
            userId: '0x123',
            getStream: getStreamMock,
        },
    }),
}))

/**
 * import AutojoinChannels AFTER mocking modules, and MUST be a dynamic import
 */
const { AutojoinChannels } = await import('../../src/components/AutojoinChannels')

afterEach(() => {
    jest.resetAllMocks()
    jest.useRealTimers()
})

const channels = mockSpaceDataWith2Channels.channelGroups.flatMap((cg) => cg.channels)

describe('<AutojoinChannels />', () => {
    test('It joins all eligible channels when loading a space', async () => {
        const mockStreamData = {
            [channels[0].id.streamId]: streamMock(),
            [channels[1].id.streamId]: streamMock(),
        }
        getStreamMock.mockImplementation((streamId: string) => mockStreamData[streamId])
        render(<AutojoinChannels />)
        await waitFor(() => {
            expect(joinRoomMock).toBeCalledTimes(2)
        })
    })

    test('It does not try to join a channel that has any record of room account membership data', () => {
        jest.useFakeTimers()
        const mockStreamData = {
            [channels[0].id.streamId]: streamMock('0x123'),
            [channels[1].id.streamId]: streamMock('0x123'),
        }
        getStreamMock.mockImplementation((streamId: string) => mockStreamData[streamId])
        render(<AutojoinChannels />)
        jest.runAllTimers() // run all the timers so we're not getting a false positive b/c joinRoom was queued but not called yet
        expect(joinRoomMock).not.toBeCalled()
    })
})

function streamMock(userId?: string) {
    return {
        getMemberships: () => ({
            leftUsers: new Set(userId),
        }),
    }
}
