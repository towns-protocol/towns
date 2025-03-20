import { Client as CasablancaClient, isSpaceStreamId } from '@towns-protocol/sdk'
import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { MembershipOp, SnapshotCaseType } from '@towns-protocol/proto'
import debounce from 'lodash/debounce'

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds(casablancaClient: CasablancaClient | undefined): string[] {
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

        const debouncedUpdateSpaces = debounce(updateSpaces, 250, { maxWait: 250 })

        const onStreamInitialized = (streamId: string, _kind: SnapshotCaseType) => {
            if (streamId === casablancaClient.userStreamId) {
                debouncedUpdateSpaces()
            }
        }

        const onUserMembershipsChanged = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                debouncedUpdateSpaces()
            }
        }

        debouncedUpdateSpaces()

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('userStreamMembershipChanged', onUserMembershipsChanged)
        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('userStreamMembershipChanged', onUserMembershipsChanged)
        }
    }, [casablancaClient])

    return spaceIds
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
