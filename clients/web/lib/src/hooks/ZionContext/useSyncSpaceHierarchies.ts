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
import { MessageType, SpaceHierarchies } from '../../types/zion-types'
import { useCallback, useEffect, useRef, useState } from 'react'

import { QuerySyncKey } from '../query-keys'
import { RoomIdentifier } from '../../types/room-identifier'
import { ZionClient } from '../../client/ZionClient'
import { toZionSpaceChild } from '../../store/use-matrix-store'
import { useQueryClient } from '@tanstack/react-query'
import { useSpaceIdStore } from './useSpaceIds'

interface SyncInfo {
    spaceId: string
    timestamp: number
}

interface SyncContext {
    [spaceId: string]: SyncInfo
}

// the spaces are just tacked on to the matrix design system,
// child events should be treated like state events, but they are not,
// so we have to go and fetch them manually
// assumes spaceIds is stable, meaning if networkId doesn't change, it will remain the same object
export function useSyncSpaceHierarchies(
    client: ZionClient | undefined,
    matrixClient: MatrixClient | undefined,
    invitedToIds: RoomIdentifier[],
): { spaceHierarchies: SpaceHierarchies; syncSpaceHierarchy: (spaceId: RoomIdentifier) => void } {
    const { spaceIds } = useSpaceIdStore()
    const [spaceHierarchies, setSpaceHierarchies] = useState<SpaceHierarchies>({})
    const [spaceIdsQueue, setSpaceIdsQueue] = useState<string[]>(spaceIds.map((r) => r.networkId))
    const seenSpaceIds = useRef<RoomIdentifier[]>(spaceIds)
    const seenInvitedToIds = useRef<RoomIdentifier[]>(invitedToIds)
    const syncContextRef = useRef<SyncContext>({})
    const queryClient = useQueryClient()

    const enqueueSpaceId = (spaceId: string) => {
        setSpaceIdsQueue((prev) => {
            if (prev.includes(spaceId)) {
                return prev
            }
            return [...prev, spaceId]
        })
    }
    const dequeueSpaceId = (spaceId: string) => {
        setSpaceIdsQueue((prev) => {
            if (!prev.includes(spaceId)) {
                return prev
            }
            return prev.filter((id) => id !== spaceId)
        })
    }
    const syncSpaceHierarchy = useCallback((spaceId: RoomIdentifier) => {
        enqueueSpaceId(spaceId.networkId)
    }, [])
    // our queue
    useEffect(() => {
        if (!client || !matrixClient) {
            console.error('!!!!! hierarchies client or matrixClient is undefined')
            return
        }
        const spaceId = spaceIdsQueue.shift()
        if (!spaceId) {
            return
        }
        dequeueSpaceId(spaceId)
        const roomIdentifier = seenSpaceIds.current.find((s) => s.networkId === spaceId)
        if (!roomIdentifier) {
            console.error("!!!!! hierarchies can't find roomIdentifier for spaceId")
            return
        }
        const syncTimestamp = Date.now()
        syncContextRef.current[spaceId] = {
            spaceId,
            timestamp: syncTimestamp,
        }
        console.log('hierarchies sync started', syncContextRef.current[spaceId])
        const inflight = async () => {
            const hierarchy = await client.syncSpace(roomIdentifier)
            if (!hierarchy) {
                return
            }
            // set state if the timestamp is more recent.
            // avoids race condition if the inflight() promise completes out of order
            // because of useEffect re-runs due to dependency array changes
            if (syncTimestamp >= syncContextRef.current[spaceId].timestamp) {
                setSpaceHierarchies((prev) => {
                    const spaceHierarchy = {
                        root: toZionSpaceChild(hierarchy.root),
                        children: hierarchy.children.map((r) => toZionSpaceChild(r)),
                    }
                    return {
                        ...prev,
                        [spaceId]: spaceHierarchy,
                    }
                })
            }
        }

        inflight()
            .catch(() => {
                console.error('hierarchies error syncing space', spaceId)
            })
            .finally(() => {
                console.log('hierarchies done syncing space', spaceId)
            })
    }, [client, matrixClient, spaceIdsQueue])
    // watch for new or updated space ids
    useEffect(() => {
        const newIds = spaceIds.filter((x) => !seenSpaceIds.current.includes(x))
        const removedIds = seenSpaceIds.current.filter((s) => !spaceIds.includes(s))
        newIds.forEach((s) => enqueueSpaceId(s.networkId))
        removedIds.forEach((s) => dequeueSpaceId(s.networkId))
        seenSpaceIds.current = spaceIds
    }, [spaceIds])
    // when we get a new invite, we need to sync all the spaces because we don't know which one it is for yet
    useEffect(() => {
        const newIds = invitedToIds.filter((x) => !seenInvitedToIds.current.includes(x))
        if (newIds.length > 0) {
            // enqueue all the spaces (we don't know which one it is for yet)
            spaceIds.forEach((s) => enqueueSpaceId(s.networkId))
        }
        seenInvitedToIds.current = invitedToIds
    }, [invitedToIds, spaceIds])
    // watch client for space updates
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
                queryClient.removeQueries({
                    queryKey: [QuerySyncKey.SyncEntitledChannels, eventRoomId],
                })
                // console.log("!!!!! hierarchies new space child", eventRoom.roomId);
                enqueueSpaceId(eventRoomId)
            }
        }
        matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        return () => {
            matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
        }
    }, [matrixClient, queryClient, spaceIds])

    // watch for when a channel name changes
    useEffect(() => {
        const onNameEvent = (room: MatrixRoom) => {
            const parentSpaceId = getParentSpaceId(room, spaceIds)
            if (parentSpaceId) {
                queryClient.removeQueries({
                    queryKey: [QuerySyncKey.SyncEntitledChannels, parentSpaceId],
                })
                enqueueSpaceId(parentSpaceId)
            }
        }

        matrixClient?.on(RoomEvent.Name, onNameEvent)
        return () => {
            matrixClient?.off(RoomEvent.Name, onNameEvent)
        }
    }, [matrixClient, queryClient, spaceIds])

    // watch for when user joins or leaves a channel
    useEffect(() => {
        function onMyMembership(
            room: Room,
            membership: string,
            prevMembership?: string | undefined,
        ) {
            const parentSpaceId = getParentSpaceId(room, spaceIds)
            if (parentSpaceId) {
                queryClient.removeQueries({
                    queryKey: [QuerySyncKey.SyncEntitledChannels, parentSpaceId],
                })
                enqueueSpaceId(parentSpaceId)
            }
        }

        matrixClient?.on(RoomEvent.MyMembership, onMyMembership)
        return () => {
            matrixClient?.off(RoomEvent.MyMembership, onMyMembership)
        }
    }, [matrixClient, queryClient, spaceIds])

    return { spaceHierarchies, syncSpaceHierarchy }
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
