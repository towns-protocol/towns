import { useRawTimelineStore, useTownsContext } from 'use-towns-client'
import { useEffect, useMemo, useState } from 'react'
import debounce from 'lodash/debounce'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@towns-protocol/sdk'
import { DMChannelMenuItem } from 'hooks/useSortedChannels'
import { createInlineWorker } from 'utils/createInlineWebWorker'

const READY_TIMEOUT = 3_000
const DEBOUNCE_MS = 300

type MemberNotInDMsChannelMenuItem = {
    type: 'memberNotInDMs'
    id: string
    latestMs: number
}

function calculateMembersNotInDMs(
    dmItems: DMChannelMenuItem[],
    memberIds: string[],
    latestEvents: ReturnType<typeof useRawTimelineStore.getState>['lastestEventByUser'],
) {
    const DM_THRESHOLD = 50

    if (dmItems.length >= DM_THRESHOLD) {
        return []
    }

    const usersInDMs = new Set(dmItems.flatMap((dm) => dm.channel.userIds))
    const remainingSlots = DM_THRESHOLD - dmItems.length

    const eligibleUsers = memberIds
        .reduce<{ id: string; lastEventMs: number }[]>((acc, memberId) => {
            // Stop early if we have enough
            if (acc.length >= remainingSlots) {
                return acc
            }
            if (!usersInDMs.has(memberId)) {
                acc.push({
                    id: memberId,
                    lastEventMs: latestEvents[memberId]?.createdAtEpochMs ?? 0,
                })
            }
            return acc
        }, [])
        .sort((a, b) => b.lastEventMs - a.lastEventMs)
        .map(({ id }) => ({
            type: 'memberNotInDMs' as const,
            id,
            latestMs: Date.now(),
        }))

    return eligibleUsers
}

const workerFn = createInlineWorker(calculateMembersNotInDMs)

export function useMembersNotInDMs(args: { dmItems: DMChannelMenuItem[]; memberIds: string[] }): {
    data: MemberNotInDMsChannelMenuItem[]
    isLoading: boolean
} {
    const { dmItems, memberIds } = args
    const [ready, setReady] = useState(false)
    const { casablancaClient } = useTownsContext()
    const [result, setResult] = useState<MemberNotInDMsChannelMenuItem[]>([])

    useEffect(() => {
        let mounted = true

        const debouncedCalculation = debounce(
            (dmItems: DMChannelMenuItem[], memberIds: string[]) => {
                workerFn(dmItems, memberIds, useRawTimelineStore.getState().lastestEventByUser)
                    .then((result) => {
                        if (mounted) {
                            setResult(result)
                        }
                    })
                    .catch(console.error)
            },
            DEBOUNCE_MS,
        )

        debouncedCalculation(dmItems, memberIds)

        return () => {
            mounted = false
            debouncedCalculation.cancel()
        }
    }, [dmItems, memberIds])

    // there is no great way to know when DMs are ready, or if this user has DMs at all,
    // so rather than immediately show the members and have it replaced by DMs once they load,
    // we can fake wait for DMs to load, or timeout after a bit if they never load
    useEffect(() => {
        let mounted = true

        const timeoutId = setTimeout(() => {
            if (mounted) {
                setReady(true)
            }
        }, READY_TIMEOUT)

        const handler = (streamId: string) => {
            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                if (mounted) {
                    setReady(true)
                }
            }
        }
        casablancaClient?.once('streamInitialized', handler)

        return () => {
            mounted = false
            clearTimeout(timeoutId)
            casablancaClient?.off('streamInitialized', handler)
        }
    }, [casablancaClient])

    return useMemo(() => {
        return {
            data: result,
            isLoading: !ready,
        }
    }, [ready, result])
}
