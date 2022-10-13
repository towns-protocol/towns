import { useEffect, useState } from 'react'
import { EventType } from 'matrix-js-sdk'
import { ZionClient } from '../../client/ZionClient'

export function useSpaceMentionCounts(
    client: ZionClient | undefined,
    spaceIds: string[],
    mentionCounts: Record<string, number>,
): { spaceMentionCounts: Record<string, number> } {
    const [spaceMentionCounts, setSpaceMentionCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        if (!client) {
            return
        }
        // gets run every time spaceIds changes
        console.log('USE SPACE MENTION COUNTS::running effect')
        const updateSpaceMentionCounts = (spaceId: string, count: number) => {
            setSpaceMentionCounts((prev) => {
                if (prev[spaceId] === count) {
                    return prev
                }
                //console.log("!!!! updating space mention", spaceId, count);
                return {
                    ...prev,
                    [spaceId]: count,
                }
            })
        }

        spaceIds.forEach((spaceId) => {
            const space = client.getRoom(spaceId)
            if (!space) {
                return
            }
            const count = space.currentState
                .getStateEvents(EventType.SpaceChild)
                .reduce((count, event) => {
                    const stateKey = event.getStateKey()
                    const childCount = stateKey !== undefined ? mentionCounts[stateKey] ?? 0 : 0
                    return count + childCount
                }, 0)
            updateSpaceMentionCounts(spaceId, count)
        })
    }, [client, spaceIds, mentionCounts])

    return { spaceMentionCounts }
}
