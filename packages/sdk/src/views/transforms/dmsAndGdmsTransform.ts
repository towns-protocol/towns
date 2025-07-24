import { ChannelProperties } from '@towns-protocol/proto'
import { Membership } from '../models/timelineTypes'
import { DmStreamModel } from '../streams/dmStreams'
import { GdmStreamModel } from '../streams/gdmStreams'
import { isDefined } from '../../check'
import { isEqual } from 'lodash-es'

export interface DmAndGdmModel {
    id: string
    joined: boolean
    left: boolean
    userIds: string[]
    properties?: ChannelProperties
    isDecryptingProperties?: boolean
    lastEventCreatedAtEpochMs: bigint
    isGdm: boolean
}

interface Input {
    userId: string
    memberships: Record<string, Membership>
    streamMemberIds: Record<string, string[] | undefined>
    dmStreams: Record<string, DmStreamModel | undefined>
    gdmStreams: Record<string, GdmStreamModel | undefined>
}

export function dmsAndGdmsTransform(
    value: Input,
    prev: Input,
    prevResult?: DmAndGdmModel[],
): DmAndGdmModel[] {
    // note to self, it makes more sense to loop over memberships, and to hydrate the dm/gdms from
    // local storage, then from remote data source, but for now we are copying existing behavior which is to
    // loop over streams and filter out the ones that are not relevant to the user
    const prevMap = new Map(prevResult?.map((x) => [x.id, x]))
    const userId = value.userId
    const gdmStreams = Object.entries(value.gdmStreams)
        .map(([streamId, gdmStream]) => {
            if (!gdmStream) {
                return undefined
            }
            const membership = value.memberships[streamId]
            const streamMemberIds = value.streamMemberIds[streamId]
                ?.filter((memberUserId) => memberUserId !== userId)
                .sort((a, b) => a.localeCompare(b))
            const newGdm = {
                id: streamId,
                joined: membership === Membership.Join,
                left: membership === Membership.Leave,
                userIds: streamMemberIds ?? [],
                properties: gdmStream.metadata,
                isDecryptingProperties:
                    gdmStream.latestMetadataEventId !== gdmStream.metadataEventId,
                lastEventCreatedAtEpochMs: gdmStream.lastEventCreatedAtEpochMs,
                isGdm: true,
            } satisfies DmAndGdmModel
            if (prevMap.has(streamId)) {
                const prevGdm = prevMap.get(streamId)
                if (isEqual(newGdm, prevGdm)) {
                    return prevGdm
                }
            }
            return newGdm
        })
        .filter(isDefined)

    const dmStreams = Object.entries(value.dmStreams)
        .map(([streamId, dmStream]) => {
            if (!dmStream) {
                return undefined
            }
            const membership = value.memberships[streamId]
            const streamMemberIds = value.streamMemberIds[streamId]
                ?.filter(
                    (memberUserId, _index, numParticipants) =>
                        memberUserId !== userId || numParticipants.length === 1,
                )
                .sort((a, b) => a.localeCompare(b))
            const newDm = {
                id: streamId,
                joined: membership === Membership.Join,
                left: membership === Membership.Leave,
                userIds: streamMemberIds ?? [],
                properties: undefined,
                lastEventCreatedAtEpochMs: dmStream.lastEventCreatedAtEpochMs,
                isGdm: false,
            } satisfies DmAndGdmModel
            if (prevMap.has(streamId)) {
                const prevDm = prevMap.get(streamId)
                if (isEqual(newDm, prevDm)) {
                    return prevDm
                }
            }
            return newDm
        })
        .filter(isDefined)

    const channels = [...dmStreams, ...gdmStreams].sort((a, b) => {
        if (a.lastEventCreatedAtEpochMs === b.lastEventCreatedAtEpochMs) {
            // If lastEventCreatedAtEpochMs is equal, sort by id
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        }
        // Otherwise, sort by lastEventCreatedAtEpochMs
        return a.lastEventCreatedAtEpochMs > b.lastEventCreatedAtEpochMs ? -1 : 1
    })

    if (prevResult && isEqual(prevResult, channels)) {
        return prevResult
    }
    return channels
}
