/**
 * @group casablanca
 */

import { jest } from '@jest/globals'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { mockSpaceDataWith2Channels } from '../mocks/spaceData'

const joinRoomMock = jest.fn()

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

let userJoinedSet = new Set()
let userLeftSet = new Set()

const useZionContextResponse = {
    casablancaClient: {
        userStreamId: 'USER_STREAM_ID',
        streams: {
            get: () => {
                return {
                    view: {
                        userContent: {
                            userJoinedStreams: userJoinedSet,
                            userLeftStreams: userLeftSet,
                        },
                    },
                }
            },
        },
    },
}

jest.unstable_mockModule('../../src/components/ZionContextProvider', () => ({
    useZionContext: () => useZionContextResponse,
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
        userJoinedSet = new Set()
        userLeftSet = new Set()
        render(<AutojoinChannels />)
        await waitFor(() => {
            expect(joinRoomMock).toBeCalledTimes(2)
        })
    })

    test('It does not try to join a channel if the user has has already joined', () => {
        jest.useFakeTimers()
        userJoinedSet = new Set([channels[0].id, channels[1].id])
        userLeftSet = new Set()
        render(<AutojoinChannels />)
        jest.runAllTimers() // run all the timers so we're not getting a false positive b/c joinRoom was queued but not called yet
        expect(joinRoomMock).not.toBeCalled()
    })

    test('It does not try to join a channel if the user has has already left', () => {
        jest.useFakeTimers()
        userJoinedSet = new Set()
        userLeftSet = new Set([channels[0].id, channels[1].id])
        render(<AutojoinChannels />)
        jest.runAllTimers() // run all the timers so we're not getting a false positive b/c joinRoom was queued but not called yet
        expect(joinRoomMock).not.toBeCalled()
    })
})
