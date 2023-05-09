import { Client as CasablancaClient, ParsedEvent, Stream } from '@towns/sdk'
import { useEffect, useState } from 'react'
import { makeRoomIdentifier } from '../../types/room-identifier'
import { SpaceItem } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'
import { PayloadCaseType } from '@towns/proto'

export function useCasablancaSpaces(casablancaClient?: CasablancaClient): SpaceItem[] {
    const [spaces, setSpaces] = useState<SpaceItem[]>([])

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateSpaces = () => {
            const streams = Array.from(casablancaClient.streams.values())
                .filter((stream: Stream) => stream.rollup.payloadKind === 'spacePayload')
                .sort((a: Stream, b: Stream) => a.rollup.streamId.localeCompare(b.rollup.streamId))
                .map(
                    (stream: Stream) =>
                        ({
                            id: makeRoomIdentifier(stream.rollup.streamId),
                            name: stream.rollup.streamId, // todo real name
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
            kind: PayloadCaseType,
            _messages: ParsedEvent[],
        ) => {
            if (kind === 'spacePayload') {
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
