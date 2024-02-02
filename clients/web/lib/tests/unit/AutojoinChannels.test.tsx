/**
 * @group casablanca
 */

import { jest } from '@jest/globals'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { mockSpaceDataWith2Channels } from '../mocks/spaceData'
import { MembershipOp, MembershipReason, UserPayload_UserMembership } from '@river/proto'

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

const channel0Id = mockSpaceDataWith2Channels.channelGroups[0].channels[0].id
const channel1Id = mockSpaceDataWith2Channels.channelGroups[0].channels[1].id

const streamMemberships = {
    [channel0Id]: new UserPayload_UserMembership({}),
    [channel1Id]: new UserPayload_UserMembership({}),
}

const useZionContextResponse = {
    casablancaClient: {
        userStreamId: 'USER_STREAM_ID',
        streams: {
            get: () => {
                return {
                    view: {
                        userContent: {
                            streamMemberships: streamMemberships,
                            isMember: (streamId: string, membershipOp: MembershipOp) => {
                                return streamMemberships[streamId].op === membershipOp
                            },
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

describe('<AutojoinChannels />', () => {
    test('It joins all eligible channels when loading a space', async () => {
        streamMemberships[channel0Id].op = MembershipOp.SO_UNSPECIFIED
        streamMemberships[channel1Id].op = MembershipOp.SO_UNSPECIFIED
        render(<AutojoinChannels />)
        await waitFor(() => {
            expect(joinRoomMock).toBeCalledTimes(2)
        })
    })

    test('It does not try to join a channel if the user has has already joined', () => {
        jest.useFakeTimers()
        streamMemberships[channel0Id].op = MembershipOp.SO_JOIN
        streamMemberships[channel1Id].op = MembershipOp.SO_JOIN
        render(<AutojoinChannels />)
        jest.runAllTimers() // run all the timers so we're not getting a false positive b/c joinRoom was queued but not called yet
        expect(joinRoomMock).not.toBeCalled()
    })

    test('It does not try to join a channel if the user has has already left', () => {
        jest.useFakeTimers()
        streamMemberships[channel0Id].op = MembershipOp.SO_LEAVE
        streamMemberships[channel1Id].op = MembershipOp.SO_LEAVE
        render(<AutojoinChannels />)
        jest.runAllTimers() // run all the timers so we're not getting a false positive b/c joinRoom was queued but not called yet
        expect(joinRoomMock).not.toBeCalled()
    })

    test('It does try to join a channel if the user left for reason left_space', async () => {
        jest.useFakeTimers()
        streamMemberships[channel0Id].op = MembershipOp.SO_LEAVE
        streamMemberships[channel1Id].op = MembershipOp.SO_LEAVE
        streamMemberships[channel1Id].reason = MembershipReason.MR_LEFT_SPACE
        render(<AutojoinChannels />)
        await waitFor(() => {
            expect(joinRoomMock).toBeCalledTimes(1)
        })
    })
})
