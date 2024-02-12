import { Client as CasablancaClient, Stream, isSpaceStreamId, isUserStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import { SpaceItem } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'
import { useSpaceNames } from '../../hooks/use-space-data'

export function useCasablancaSpaces(casablancaClient?: CasablancaClient): SpaceItem[] {
    const [spaces, setSpaces] = useState<SpaceItem[]>([])
    const { data: spaceInfo } = useSpaceNames(casablancaClient)
    const userStreamId = casablancaClient?.userStreamId
    useEffect(() => {
        if (!casablancaClient || !userStreamId) {
            return
        }

        const userStream = casablancaClient.streams.get(userStreamId)
        if (!userStream) {
            return
        }

        const updateSpaces = () => {
            const streams = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'spaceContent')
                .filter((stream: Stream) => {
                    return userStream.view.userContent.isJoined(stream.view.streamId)
                })
                .sort((a: Stream, b: Stream) => a.view.streamId.localeCompare(b.view.streamId))
                .map(
                    (stream: Stream) =>
                        ({
                            id: stream.view.streamId,
                            name:
                                spaceInfo?.find((i) => i.networkId == stream.streamId)?.name ?? '',
                            avatarSrc: '',
                        } satisfies SpaceItem),
                )

            setSpaces((prev) => {
                if (isEqual(prev, streams)) {
                    return prev
                }
                return streams
            })
        }

        const onStreamChange = (streamId: string) => {
            if (isSpaceStreamId(streamId) || isUserStreamId(streamId)) {
                updateSpaces()
            }
        }

        updateSpaces()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('userStreamMembershipChanged', onStreamChange)
        casablancaClient.on('streamUpdated', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('userStreamMembershipChanged', onStreamChange)
            casablancaClient.off('streamUpdated', onStreamChange)
        }
    }, [casablancaClient, spaceInfo, userStreamId])
    return spaces
}
