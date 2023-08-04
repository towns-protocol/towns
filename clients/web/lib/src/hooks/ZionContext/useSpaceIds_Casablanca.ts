import { Client as CasablancaClient, ParsedEvent } from '@towns/sdk'
import { useEffect, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier } from '../../types/room-identifier'
import isEqual from 'lodash/isEqual'
import { PayloadCaseType } from '@river/proto'

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
                .filter((stream) => stream.view.payloadKind === 'spacePayload')
                .sort((a, b) => a.view.streamId.localeCompare(b.view.streamId))
            //TODO: HNT-1550 - commented line below is a temporary fix for HNT-1550
            const joined = streams
                //.filter((stream) => stream.view.userJoinedStreams.has(userId))
                .map((stream) => makeRoomIdentifier(stream.view.streamId))

            const invited = streams
                .filter((stream) => stream.view.userInvitedStreams.has(userId))
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
