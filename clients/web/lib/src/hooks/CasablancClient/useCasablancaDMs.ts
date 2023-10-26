import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'
import { Stream } from '@river/sdk'
import { makeRoomIdentifier } from '../../types/room-identifier'
import { SnapshotCaseType } from '@river/proto'
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
            const channels = Array.from(casablancaClient.streams.values())
                .filter((stream: Stream) => stream.view.contentKind === 'dmChannelContent')
                .map(
                    (stream: Stream) =>
                        ({
                            id: makeRoomIdentifier(stream.view.streamId),
                            joined: stream.view.getMemberships().isMemberJoined(),
                            userIds: Array.from(stream.view.dmChannelContent.participants()).filter(
                                (memberUserId) => memberUserId !== userId,
                            ),
                            lastEventCreatedAtEpocMs:
                                stream.view.dmChannelContent.lastEventCreatedAtEpocMs,
                        } satisfies DMChannelIdentifier),
                )
                .sort((a, b) => {
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
            if (kind === 'dmChannelContent') {
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
    })
    return { channels }
}
