import { UserPayload_UserMembership } from '@towns-protocol/proto'
import { Membership } from '../models/timelineTypes'
import { UserStreamModel } from '../streams/userStreamsView'
import { toMembership } from '../models/timelineEvent'
import { isEqual } from 'lodash-es'

export function membershipsTransform(
    userStream?: UserStreamModel,
    _prev?: UserStreamModel,
    prevResult?: Record<string, Membership>,
): Record<string, Membership> {
    const streamMemberships = userStream?.streamMemberships ?? {}
    const memberships = Object.entries(streamMemberships).reduce(
        (
            acc: Record<string, Membership>,
            entry: [string, UserPayload_UserMembership | undefined],
        ) => {
            if (entry[1]) {
                acc[entry[0]] = toMembership(entry[1].op)
            }
            return acc
        },
        {},
    )
    if (prevResult && isEqual(prevResult, memberships)) {
        return prevResult
    }
    return memberships
}
