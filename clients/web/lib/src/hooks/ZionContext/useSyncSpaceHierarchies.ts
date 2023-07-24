/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    IRoomTimelineData,
    MatrixClient,
    MatrixEvent,
    EventType as MatrixEventType,
    MsgType as MatrixMsgType,
    Room as MatrixRoom,
    Room,
    RoomEvent,
} from 'matrix-js-sdk'
import { SpaceHierarchies } from '../../types/zion-types'
import { useCallback, useEffect, useRef, useState } from 'react'

import { removeSyncedEntitledChannelsQueriesForSpace } from '../../query/removeSyncedEntitledChannelQueries'
import { RoomIdentifier } from '../../types/room-identifier'
import { ZionClient } from '../../client/ZionClient'
import { toZionSpaceChild } from '../../store/use-matrix-store'
import { useQueryClient } from '../../query/queryClient'
import { useSpaceIdStore } from './useSpaceIds'

export type InitialSyncSortPredicate = (a: RoomIdentifier, b: RoomIdentifier) => number

// the spaces are just tacked on to the matrix design system,
// child events should be treated like state events, but they are not,
// so we have to go and fetch them manually
// assumes spaceIds is stable, meaning if networkId doesn't change, it will remain the same object
export function useSyncSpaceHierarchies(
    client: ZionClient | undefined,
    matrixClient: MatrixClient | undefined,
    invitedToIds: RoomIdentifier[],
    loggedInWalletAddress: string | undefined,
    sortPredicate?: InitialSyncSortPredicate,
    timeBetweenSyncingSpaces?: number,
): { matrixSpaceHierarchies: SpaceHierarchies; syncSpaceHierarchy: (spaceId: string) => void } {
    const { spaceIds } = useSpaceIdStore()
    const [spaceHierarchies, setSpaceHierarchies] = useState<SpaceHierarchies>({})
    const [spaceIdsQueue, setSpaceIdsQueue] = useState<string[]>(spaceIds.map((r) => r.networkId))
    const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null)
    const seenSpaceIds = useRef<RoomIdentifier[]>(spaceIds)
    const seenInvitedToIds = useRef<RoomIdentifier[]>(invitedToIds)
    const queryClient = useQueryClient()
    const sortPredicateRef = useRef(sortPredicate)

    const enqueueSpaceId = useCallback((spaceId: string) => {
        setSpaceIdsQueue((prev) => {
            if (prev.includes(spaceId)) {
                return prev
            }
            return [...prev, spaceId]
        })
    }, [])
    const dequeueSpaceId = (spaceId: string) => {
        setSpaceIdsQueue((prev) => {
            if (!prev.includes(spaceId)) {
                return prev
            }
            return prev.filter((id) => id !== spaceId)
        })
    }
    // our queue
    useEffect(() => {
        if (
            !client ||
            !matrixClient ||
            currentSpaceId // sync in progress. skip this iteration.
        ) {
            return
        }
        const spaceId = spaceIdsQueue.shift()
        if (!spaceId) {
            return
        }
        dequeueSpaceId(spaceId)
        const roomIdentifier = seenSpaceIds.current.find((s) => s.networkId === spaceId)
        if (!roomIdentifier) {
            console.error(
                "[useSyncSpaceHierarchies] can't find roomIdentifier for spaceId. skipping.",
                spaceId,
            )
            return
        }

        if (!loggedInWalletAddress) {
            console.error('[useSyncSpaceHierarchies] no saved wallet for user. skipping sync.')
            return
        }

        // start the sync
        setCurrentSpaceId(spaceId)
        // define the function that does the actual sync
        const _syncSpace = async () => {
            const hierarchy = await client.syncSpace(roomIdentifier, loggedInWalletAddress)
            if (!hierarchy) {
                return
            }
            setSpaceHierarchies((prev) => {
                const spaceHierarchy = {
                    root: toZionSpaceChild(hierarchy.root),
                    children: hierarchy.children.map((r) => toZionSpaceChild(r)),
                }
                console.log("[useSyncSpaceHierarchies] sync'ed space hierarchy", spaceHierarchy)
                return {
                    ...prev,
                    [spaceId]: spaceHierarchy,
                }
            })
        }
        // call the sync function
        _syncSpace()
            .catch((e) => {
                console.error('[useSyncSpaceHierarchies] error syncing space', spaceId, e)
            })
            .finally(() => {
                // reset the current space id so that the next iteration can start
                setTimeout(() => {
                    setCurrentSpaceId(null)
                }, timeBetweenSyncingSpaces ?? 0)
            })
    }, [
        client,
        currentSpaceId,
        matrixClient,
        spaceIdsQueue,
        loggedInWalletAddress,
        timeBetweenSyncingSpaces,
    ])

    // watch for new or updated space ids
    useEffect(() => {
        // console.log("!!!!! hierarchies USE EFFECT spaceIds:", spaceIds);
        const newIds = spaceIds.filter((x) => !seenSpaceIds.current.includes(x))
        const removedIds = seenSpaceIds.current.filter((s) => !spaceIds.includes(s))
        // console.log('!!!!! hierarchies new ids', newIds)
        // console.log('!!!!! hierarchies removed ids', removedIds)
        // on first load, sort the spaces if applicable
        if (seenSpaceIds.current.length === 0 && newIds.length > 0 && sortPredicateRef.current) {
            newIds.sort(sortPredicateRef.current).forEach((s) => enqueueSpaceId(s.networkId))
        } else {
            newIds.forEach((s) => enqueueSpaceId(s.networkId))
        }
        removedIds.forEach((s) => dequeueSpaceId(s.networkId))
        seenSpaceIds.current = spaceIds
    }, [enqueueSpaceId, spaceIds])

    // when we get a new invite, we need to sync all the spaces because we don't know which one it is for yet
    useEffect(() => {
        // console.log("!!!!! hierarchies USE EFFECT invitedToIds:", invitedToIds);
        const newIds = invitedToIds.filter((x) => !seenInvitedToIds.current.includes(x))
        if (newIds.length > 0) {
            // enqueue all the spaces (we don't know which one it is for yet)
            spaceIds.forEach((s) => enqueueSpaceId(s.networkId))
        }
        seenInvitedToIds.current = invitedToIds
    }, [enqueueSpaceId, invitedToIds, spaceIds])

    // watch client for channel creation
    useEffect(() => {
        if (!matrixClient) {
            return
        }
        const onRoomTimelineEvent = (
            event: MatrixEvent,
            eventRoom: MatrixRoom | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            data: IRoomTimelineData,
        ) => {
            const eventRoomId = event.getRoomId() ?? eventRoom?.roomId
            if (!eventRoomId) {
                return
            }
            if (!spaceIds.find((s) => s.networkId === eventRoomId)) {
                return
            }
            const eventType = event.getType()
            if (eventType === MatrixEventType.SpaceChild || eventType === MatrixMsgType.Notice) {
                removeSyncedEntitledChannelsQueriesForSpace(eventRoomId)
                // console.log("!!!!! hierarchies new space child", eventRoom.roomId);
                enqueueSpaceId(eventRoomId)
            }
        }
        matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        return () => {
            // console.log("!!! REMOVING EVENTS");
            matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
        }
    }, [enqueueSpaceId, matrixClient, queryClient, spaceIds])

    // watch for when a channel name changes
    useEffect(() => {
        const onNameEvent = (room: MatrixRoom) => {
            const parentSpaceId = getParentSpaceId(room, spaceIds)
            if (parentSpaceId) {
                removeSyncedEntitledChannelsQueriesForSpace(parentSpaceId)
                enqueueSpaceId(parentSpaceId)
            }
        }

        matrixClient?.on(RoomEvent.Name, onNameEvent)
        return () => {
            matrixClient?.off(RoomEvent.Name, onNameEvent)
        }
    }, [enqueueSpaceId, matrixClient, queryClient, spaceIds])

    // watch for when current user joins or leaves a channel
    useEffect(() => {
        function onMyMembership(
            room: Room,
            membership: string,
            prevMembership?: string | undefined,
        ) {
            const parentSpaceId = getParentSpaceId(room, spaceIds)
            if (parentSpaceId) {
                removeSyncedEntitledChannelsQueriesForSpace(parentSpaceId)
                enqueueSpaceId(parentSpaceId)
            }
            console.log(
                '[useSyncSpaceHierarchies]',
                'Membership changed',
                'roomId:',
                room.roomId,
                'prevMembership:',
                prevMembership,
                'membership:',
                membership,
                'parentSpaceId:',
                parentSpaceId,
            )
        }

        matrixClient?.on(RoomEvent.MyMembership, onMyMembership)
        return () => {
            matrixClient?.off(RoomEvent.MyMembership, onMyMembership)
        }
    }, [enqueueSpaceId, matrixClient, queryClient, spaceIds])

    return { matrixSpaceHierarchies: spaceHierarchies, syncSpaceHierarchy: enqueueSpaceId }
}

function getParentSpaceId(room: MatrixRoom, spaceIds: RoomIdentifier[]) {
    const parentEvents = room.currentState
        .getStateEvents(MatrixEventType.SpaceParent)
        .map((e) => e.getStateKey())

    const parentSpaceId = parentEvents?.[0]

    if (!parentSpaceId || !spaceIds.find((s) => s.networkId === parentSpaceId)) {
        return
    }

    return parentSpaceId
}
