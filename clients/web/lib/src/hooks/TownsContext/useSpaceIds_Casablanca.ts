import { Client as CasablancaClient, isSpaceStreamId } from '@river-build/sdk'
import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { MembershipOp, SnapshotCaseType } from '@river-build/proto'

export function useSpacesIds_Casablanca(casablancaClient: CasablancaClient | undefined): {
    spaceIds: string[]
} {
    const [spaceIds, setSpaceIds] = useState<string[]>(() => getSpaceIds(casablancaClient))

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateSpaces = () => {
            const spaceIds = getSpaceIds(casablancaClient)
            setSpaceIds((prev) => {
                if (isEqual(prev, spaceIds)) {
                    return prev
                }
                return spaceIds
            })
        }

        const onStreamInitialized = (streamId: string, _kind: SnapshotCaseType) => {
            if (streamId === casablancaClient.userStreamId) {
                updateSpaces()
            }
        }

        const onUserMembershipsChanged = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                updateSpaces()
            }
        }

        updateSpaces()

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('userStreamMembershipChanged', onUserMembershipsChanged)
        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('userStreamMembershipChanged', onUserMembershipsChanged)
        }
    }, [casablancaClient])

    return {
        spaceIds,
    }
}

function getSpaceIds(casablancaClient: CasablancaClient | undefined): string[] {
    if (!casablancaClient || !casablancaClient.userStreamId) {
        return []
    }
    const userStream = casablancaClient.streams.get(casablancaClient.userStreamId)
    if (!userStream) {
        return []
    }
    return Object.entries(userStream.view.userContent.streamMemberships)
        .filter(
            ([streamId, membership]) =>
                membership.op === MembershipOp.SO_JOIN && isSpaceStreamId(streamId),
        )
        .map(([streamId]) => streamId)
        .sort((a, b) => a.localeCompare(b))
}
