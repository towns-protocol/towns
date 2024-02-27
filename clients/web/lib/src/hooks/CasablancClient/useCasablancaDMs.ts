import { Client as CasablancaClient, isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import { Stream } from '@river/sdk'
import { MembershipOp } from '@river/proto'
import isEqual from 'lodash/isEqual'
import { DMChannelIdentifier } from '../../types/dm-channel-identifier'

export function useCasablancaDMs(casablancaClient?: CasablancaClient): {
    channels: DMChannelIdentifier[]
} {
    const [channels, setChannels] = useState<DMChannelIdentifier[]>(() => [])
    const userId = casablancaClient?.userId
    const userStreamId = casablancaClient?.userStreamId
    useEffect(() => {
        if (!casablancaClient || !userId || !userStreamId) {
            return
        }
        const userStream = casablancaClient.streams.get(userStreamId)
        if (!userStream) {
            return
        }

        const updateChannels = () => {
            const dmChannels: DMChannelIdentifier[] = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'dmChannelContent')
                .map(
                    (stream: Stream) =>
                        ({
                            id: stream.view.streamId,
                            joined: userStream.view.userContent.isMember(
                                stream.view.streamId,
                                MembershipOp.SO_JOIN,
                            ),
                            left: userStream.view.userContent.isMember(
                                stream.view.streamId,
                                MembershipOp.SO_LEAVE,
                            ),
                            userIds: Array.from(stream.view.dmChannelContent.participants())
                                .filter((memberUserId) => memberUserId !== userId)
                                .sort((a, b) => a.localeCompare(b)),
                            lastEventCreatedAtEpocMs:
                                stream.view.dmChannelContent.lastEventCreatedAtEpocMs,
                            isGroup: false,
                        } satisfies DMChannelIdentifier),
                )

            const gdmChannels: DMChannelIdentifier[] = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'gdmChannelContent')
                .map(
                    (stream: Stream) =>
                        ({
                            id: stream.view.streamId,
                            joined: userStream.view.userContent.isMember(
                                stream.view.streamId,
                                MembershipOp.SO_JOIN,
                            ),
                            left: userStream.view.userContent.isMember(
                                stream.view.streamId,
                                MembershipOp.SO_LEAVE,
                            ),
                            userIds: Array.from(stream.view.getMembers().participants())
                                .filter((memberUserId) => memberUserId !== userId)
                                .sort((a, b) => a.localeCompare(b)),
                            properties: stream.view.getChannelMetadata()?.channelProperties,
                            lastEventCreatedAtEpocMs:
                                stream.view.gdmChannelContent.lastEventCreatedAtEpocMs,
                            isGroup: true,
                        } satisfies DMChannelIdentifier),
                )
            const channels = [...dmChannels, ...gdmChannels].sort((a, b) => {
                if (a.lastEventCreatedAtEpocMs === b.lastEventCreatedAtEpocMs) {
                    // If lastEventCreatedAtEpocMs is equal, sort by id
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
                }
                // Otherwise, sort by lastEventCreatedAtEpocMs
                return a.lastEventCreatedAtEpocMs > b.lastEventCreatedAtEpocMs ? -1 : 1
            })

            function isSorted(array: string[]) {
                for (let i = 0; i < array.length - 1; i++) {
                    if (array[i] > array[i + 1]) {
                        return false
                    }
                }
                return true
            }

            channels.forEach((channel) => {
                if (!isSorted(channel.userIds)) {
                    console.error('useCasablancaDMs: channel.userIds are not sorted', {
                        channel,
                    })
                }
            })

            setChannels((prev) => {
                if (isEqual(prev, channels)) {
                    prev.forEach((channel) => {
                        if (!isSorted(channel.userIds)) {
                            console.error('useCasablancaDMs: prev.userIds are not sorted', {
                                channel,
                            })
                        }
                    })
                    return prev
                } else {
                    return channels
                }
            })
        }

        const onStreamChange = (streamId: string) => {
            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                updateChannels()
            }
        }

        updateChannels()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('streamLatestTimestampUpdated', onStreamChange)
        casablancaClient.on('userStreamMembershipChanged', onStreamChange)
        casablancaClient.on('streamRemovedFromSync', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('streamLatestTimestampUpdated', onStreamChange)
            casablancaClient.off('userStreamMembershipChanged', onStreamChange)
            casablancaClient.off('streamRemovedFromSync', onStreamChange)
        }
    }, [casablancaClient, userId, userStreamId])
    return { channels }
}
