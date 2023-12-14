import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier } from '../../types/room-identifier'
import isEqual from 'lodash/isEqual'
import { SnapshotCaseType } from '@river/proto'

export function useSpacesIds_Casablanca(casablancaClient: CasablancaClient | undefined): {
    invitedToIds: RoomIdentifier[]
    spaceIds: RoomIdentifier[]
} {
    const [invitedToIds, setInvitedToIds] = useState<RoomIdentifier[]>([])
    const [spaceIds, setSpaceIds] = useState<RoomIdentifier[]>([])

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        if (!casablancaClient) {
            return
        }

        const userId = casablancaClient.userId

        const updateSpaces = () => {
            const streams = casablancaClient.streams
                .getStreams()
                .filter((stream) => stream.view.contentKind === 'spaceContent')
                .sort((a, b) => a.view.streamId.localeCompare(b.view.streamId))
            const joined = streams
                .filter((stream) => stream.view.getMemberships().joinedUsers.has(userId))
                .map((stream) => makeRoomIdentifier(stream.view.streamId))

            const invited = streams
                .filter((stream) => stream.view.getMemberships().invitedUsers.has(userId))
                .map((stream) => makeRoomIdentifier(stream.view.streamId))

            setSpaceIds((prev) => {
                if (isEqual(prev, joined)) {
                    return prev
                }
                return joined
            })
            setInvitedToIds((prev) => {
                if (isEqual(prev, invited)) {
                    return prev
                }
                return invited
            })
        }

        const onStreamChange = (_streamId: string, kind: SnapshotCaseType) => {
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
    }, [casablancaClient])

    return {
        invitedToIds,
        spaceIds,
    }
}
