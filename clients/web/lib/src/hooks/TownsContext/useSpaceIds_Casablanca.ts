import { Client as CasablancaClient, Stream, isSpaceStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { SnapshotCaseType } from '@river-build/proto'

export function useSpacesIds_Casablanca(casablancaClient: CasablancaClient | undefined): {
    spaceIds: string[]
} {
    const [spaceIds, setSpaceIds] = useState<string[]>([])

    useEffect(() => {
        if (!casablancaClient || !casablancaClient.userStreamId) {
            return
        }

        const userStream = casablancaClient.streams.get(casablancaClient.userStreamId)
        if (!userStream) {
            return
        }

        const updateSpaces = () => {
            const spaceIds = casablancaClient.streams
                .getStreams()
                .filter((stream) => stream.view.contentKind === 'spaceContent')
                .filter((stream: Stream) => {
                    return userStream.view.userContent.isJoined(stream.view.streamId)
                })
                .sort((a, b) => a.view.streamId.localeCompare(b.view.streamId))
                .map((stream) => stream.view.streamId)

            setSpaceIds((prev) => {
                if (isEqual(prev, spaceIds)) {
                    return prev
                }
                return spaceIds
            })
        }

        const onStreamChange = (_streamId: string, kind: SnapshotCaseType) => {
            if (kind === 'spaceContent') {
                updateSpaces()
            }
        }

        const onUserMembershipsChanged = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                updateSpaces()
            }
        }

        updateSpaces()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('userStreamMembershipChanged', onUserMembershipsChanged)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('userStreamMembershipChanged', onUserMembershipsChanged)
        }
    }, [casablancaClient])

    return {
        spaceIds,
    }
}
