import { Client as CasablancaClient, ParsedEvent } from '@towns/sdk'
import { useEffect, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier } from '../../types/room-identifier'
import isEqual from 'lodash/isEqual'
import { PayloadCaseType } from '@towns/proto'

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
            const streams = Array.from(casablancaClient.streams.values())
                .filter((stream) => stream.rollup.payloadKind === 'spacePayload')
                .sort((a, b) => a.rollup.streamId.localeCompare(b.rollup.streamId))
            //TODO: HNT-1550 - commented line below is a temporary fix for HNT-1550
            const joined = streams
                //.filter((stream) => stream.rollup.userJoinedStreams.has(userId))
                .map((stream) => makeRoomIdentifier(stream.rollup.streamId))

            const invited = streams
                .filter((stream) => stream.rollup.userInvitedStreams.has(userId))
                .map((stream) => makeRoomIdentifier(stream.rollup.streamId))

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
    }, [casablancaClient])

    return {
        invitedToIds,
        spaceIds,
    }
}
