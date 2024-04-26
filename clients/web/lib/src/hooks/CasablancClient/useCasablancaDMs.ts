import { Client as CasablancaClient, isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import { Stream } from '@river/sdk'
import { MembershipOp } from '@river-build/proto'
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
                            lastEventCreatedAtEpochMs:
                                stream.view.dmChannelContent.lastEventCreatedAtEpochMs,
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
                            lastEventCreatedAtEpochMs:
                                stream.view.gdmChannelContent.lastEventCreatedAtEpochMs,
                            isGroup: true,
                        } satisfies DMChannelIdentifier),
                )
            const channels = [...dmChannels, ...gdmChannels].sort((a, b) => {
                if (a.lastEventCreatedAtEpochMs === b.lastEventCreatedAtEpochMs) {
                    // If lastEventCreatedAtEpochMs is equal, sort by id
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
                }
                // Otherwise, sort by lastEventCreatedAtEpochMs
                return a.lastEventCreatedAtEpochMs > b.lastEventCreatedAtEpochMs ? -1 : 1
            })

            setChannels((prev) => {
                if (isEqual(prev, channels)) {
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
        casablancaClient.on('streamChannelPropertiesUpdated', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('streamLatestTimestampUpdated', onStreamChange)
            casablancaClient.off('userStreamMembershipChanged', onStreamChange)
            casablancaClient.off('streamRemovedFromSync', onStreamChange)
            casablancaClient.off('streamChannelPropertiesUpdated', onStreamChange)
        }
    }, [casablancaClient, userId, userStreamId])
    return { channels }
}
