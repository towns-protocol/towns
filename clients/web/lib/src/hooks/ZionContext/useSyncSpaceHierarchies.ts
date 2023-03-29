/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    MatrixEvent,
    RoomEvent,
    Room as MatrixRoom,
    IRoomTimelineData,
    EventType,
    Room,
    MatrixClient,
} from 'matrix-js-sdk'
import { useEffect, useRef, useState } from 'react'
import { toZionSpaceChild } from '../../store/use-matrix-store'
import { ZionClient } from '../../client/ZionClient'
import { SpaceHierarchies } from '../../types/zion-types'
import { RoomIdentifier } from '../../types/room-identifier'
import { ZTEvent } from '../../types/timeline-types'
import { useQueryClient } from '@tanstack/react-query'
import { QueryKeyChannels } from '../query-keys'
import { useSpaceIdStore } from './useSpaceIds'

// the spaces are just tacked on to the matrix design system,
// child events should be treated like state events, but they are not,
// so we have to go and fetch them manually
// assumes spaceIds is stable, meaning if networkId doesn't change, it will remain the same object
export function useSyncSpaceHierarchies(
    client: ZionClient | undefined,
    matrixClient: MatrixClient | undefined,
    invitedToIds: RoomIdentifier[],
): { spaceHierarchies: SpaceHierarchies } {
    const { spaceIds } = useSpaceIdStore()
    const [spaceHierarchies, setSpaceHierarchies] = useState<SpaceHierarchies>({})
    const [spaceIdsQueue, setSpaceIdsQueue] = useState<string[]>(spaceIds.map((r) => r.networkId))
    const [inFlightCurrent, setInflightCurrnet] = useState<Promise<void> | null>(null)
    const seenSpaceIds = useRef<RoomIdentifier[]>(spaceIds)
    const seenInvitedToIds = useRef<RoomIdentifier[]>(invitedToIds)
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
    // our queue
    useEffect(() => {
        if (!client || !matrixClient) {
            return
        }
        if (inFlightCurrent) {
            return
        }
        const spaceId = spaceIdsQueue.shift()
        if (!spaceId) {
            return
        }
        dequeueSpaceId(spaceId)
        const roomIdentifier = seenSpaceIds.current.find((s) => s.networkId === spaceId)
        if (!roomIdentifier) {
            throw new Error("can't find roomIdentifier for spaceId")
        }
        // console.log("!!!!! hierarchies syncing space", spaceId);
        const inflight = client
            .syncSpace(roomIdentifier)
            .then((hierarchy) => {
                if (!hierarchy) {
                    return
                }
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
            })
            .finally(() => {
                // console.log("!!!!! hierarchies done syncing space", spaceId);
                setInflightCurrnet(null)
            })
        setInflightCurrnet(inflight)
    }, [client, inFlightCurrent, matrixClient, spaceIdsQueue])
    // watch for new or updated space ids
    useEffect(() => {
        // console.log("!!!!! hierarchies USE EFFECT spaceIds:", spaceIds);
        const newIds = spaceIds.filter((x) => !seenSpaceIds.current.includes(x))
        const removedIds = seenSpaceIds.current.filter((s) => !spaceIds.includes(s))
        // console.log('!!!!! hierarchies new ids', newIds)
        // console.log('!!!!! hierarchies removed ids', removedIds)
        newIds.forEach((s) => enqueueSpaceId(s.networkId))
        removedIds.forEach((s) => dequeueSpaceId(s.networkId))
        seenSpaceIds.current = spaceIds
    }, [spaceIds])
    // when we get a new invite, we need to sync all the spaces because we don't know which one it is for yet
    useEffect(() => {
        // console.log("!!!!! hierarchies USE EFFECT invitedToIds:", invitedToIds);
        const newIds = invitedToIds.filter((x) => !seenInvitedToIds.current.includes(x))
        if (newIds.length > 0) {
            // enqueue all the spaces (we don't know which one it is for yet)
            spaceIds.forEach((s) => enqueueSpaceId(s.networkId))
        }
        seenInvitedToIds.current = invitedToIds
    }, [invitedToIds, spaceIds])
    // watch client for space udpates
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

            // TODO:  ZTEvent.BlockchainTransaction is too broad of an identifier, this is only fired for a create channel transaction. Need to update the event types to be ChannelTransaction, SpaceTransaction, etc.
            // - a ZTEvent.BlockchainTransaction is fired when a blockchain transaction stored in user's local storage resolves - it's not a Matrix Event
            // - we should sync again when this happens
            if (eventType === EventType.SpaceChild || eventType === ZTEvent.BlockchainTransaction) {
                queryClient.removeQueries({
                    queryKey: [QueryKeyChannels.SyncEntitledChannels, eventRoomId],
                })
                // console.log("!!!!! hierarchies new space child", eventRoom.roomId);
                enqueueSpaceId(eventRoomId)
            }
        }
        matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        return () => {
            // console.log("!!! REMOVING EVENTS");
            matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
        }
    }, [matrixClient, queryClient, spaceIds])

    // watch for when user joins or leaves a channel
    useEffect(() => {
        function onMyMembership(
            room: Room,
            membership: string,
            prevMembership?: string | undefined,
        ) {
            const parentEvents = room.currentState
                .getStateEvents(EventType.SpaceParent)
                .map((e) => e.getStateKey())

            const parentSpaceId = parentEvents?.[0]

            if (!parentSpaceId || !spaceIds.find((s) => s.networkId === parentSpaceId)) {
                return
            }
            queryClient.removeQueries({
                queryKey: [QueryKeyChannels.SyncEntitledChannels, parentSpaceId],
            })
            enqueueSpaceId(parentSpaceId)
        }

        matrixClient?.on(RoomEvent.MyMembership, onMyMembership)
        return () => {
            matrixClient?.off(RoomEvent.MyMembership, onMyMembership)
        }
    }, [matrixClient, queryClient, spaceIds])

    return { spaceHierarchies }
}
