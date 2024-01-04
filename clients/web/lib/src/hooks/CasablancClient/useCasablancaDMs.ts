import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'
import { Stream } from '@river/sdk'
import { MembershipOp, SnapshotCaseType } from '@river/proto'
import isEqual from 'lodash/isEqual'
import { DMChannelIdentifier } from '../../types/dm-channel-identifier'

export function useCasablancaDMs(casablancaClient?: CasablancaClient): {
    channels: DMChannelIdentifier[]
} {
    const [channels, setChannels] = useState<DMChannelIdentifier[]>([])
    const userId = casablancaClient?.userId

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateChannels = () => {
            const dmChannels = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'dmChannelContent')
                .map(
                    (stream: Stream) =>
                        ({
                            id: stream.view.streamId,
                            joined: stream.view.getMemberships().isMemberJoined(),
                            left: stream.view.getMemberships().isMember(MembershipOp.SO_LEAVE),
                            userIds: Array.from(stream.view.dmChannelContent.participants()).filter(
                                (memberUserId) => memberUserId !== userId,
                            ),
                            lastEventCreatedAtEpocMs:
                                stream.view.dmChannelContent.lastEventCreatedAtEpocMs,
                            isGroup: false,
                        } satisfies DMChannelIdentifier),
                )

            const gdmChannels = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'gdmChannelContent')
                .map(
                    (stream: Stream) =>
                        ({
                            id: stream.view.streamId,
                            joined: stream.view.getMemberships().isMemberJoined(),
                            left: stream.view.getMemberships().isMember(MembershipOp.SO_LEAVE),
                            userIds: Array.from(
                                stream.view.gdmChannelContent.participants(),
                            ).filter((memberUserId) => memberUserId !== userId),
                            properties: stream.view.getChannelMetadata()?.channelProperties,
                            lastEventCreatedAtEpocMs:
                                stream.view.gdmChannelContent.lastEventCreatedAtEpocMs,
                            isGroup: true,
                        } satisfies DMChannelIdentifier),
                )
            const channels = [...dmChannels, ...gdmChannels].sort((a, b) => {
                return a.lastEventCreatedAtEpocMs > b.lastEventCreatedAtEpocMs ? -1 : 1
            })

            setChannels((prev) => {
                if (isEqual(prev, channels)) {
                    return prev
                }
                return channels
            })
        }

        const onStreamChange = (_streamId: string, kind: SnapshotCaseType) => {
            if (kind === 'dmChannelContent' || kind === 'gdmChannelContent') {
                updateChannels()
            }
        }

        updateChannels()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('streamUpdated', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('streamUpdated', onStreamChange)
        }
    }, [casablancaClient, userId])
    return { channels }
}
