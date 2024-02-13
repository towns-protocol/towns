import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import { SnapshotCaseType } from '@river/proto'

export function useSpacesIds_Casablanca(casablancaClient: CasablancaClient | undefined): {
    spaceIds: string[]
} {
    const [spaceIds, setSpaceIds] = useState<string[]>([])

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
                .map((stream) => stream.view.streamId)

            setSpaceIds((prev) => {
                if (isEqual(prev, joined)) {
                    return prev
                }
                return joined
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
        spaceIds,
    }
}
