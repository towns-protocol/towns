import { Client as CasablancaClient, ParsedEvent, Stream } from '@river/sdk'
import { useEffect, useState } from 'react'
import { makeRoomIdentifier } from '../../types/room-identifier'
import { SpaceItem } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'
import { SnapshotCaseType } from '@river/proto'

export function useCasablancaSpaces(casablancaClient?: CasablancaClient): SpaceItem[] {
    const [spaces, setSpaces] = useState<SpaceItem[]>([])

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateSpaces = () => {
            const streams = Array.from(casablancaClient.streams.values())
                .filter((stream: Stream) => stream.view.contentKind === 'spaceContent')
                .filter((stream: Stream) => {
                    const memberships = stream.view.getMemberships()
                    return memberships.isMemberJoined()
                })
                .sort((a: Stream, b: Stream) => a.view.streamId.localeCompare(b.view.streamId))
                .map(
                    (stream: Stream) =>
                        ({
                            id: makeRoomIdentifier(stream.view.streamId),
                            name: stream.view.spaceContent.name ?? '',
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

        const onStreamChange = (
            _streamId: string,
            kind: SnapshotCaseType,
            _messages: ParsedEvent[],
        ) => {
            if (kind === 'spaceContent') {
                updateSpaces()
            }
        }

        updateSpaces()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('streamUpdated', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('streamUpdated', onStreamChange)
        }
    })
    return spaces
}
