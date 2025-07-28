import { isEqual } from 'lodash-es'
import { TimelineEvent } from '../models/timelineTypes'
import { DmAndGdmModel } from './dmsAndGdmsTransform'

interface Input {
    memberIds: string[]
    latestEventByUser: Record<string, TimelineEvent>
    dmsAndGdms: DmAndGdmModel[]
}

export interface MemberNotInDms {
    id: string
    latestEventMs: number
}

export interface MembersNotInDms {
    members: MemberNotInDms[]
}

export function membersNotInDmsTransform(
    value: Input,
    prev: Input,
    prevResult?: MembersNotInDms,
): MembersNotInDms {
    const DM_THRESHOLD = 50
    const { memberIds, latestEventByUser, dmsAndGdms } = value
    // any DM channels should only be considered if they involve members of this space
    const memberIdSet = new Set(memberIds)
    const spaceRelatedDMChannels = dmsAndGdms.filter((dm) =>
        // dms can have multiple users, so only show the DM if all the users in the DM channel are members of this space
        dm.userIds.every((userId) => memberIdSet.has(userId)),
    )

    if (spaceRelatedDMChannels.length >= DM_THRESHOLD) {
        if (prevResult?.members.length === 0) {
            return prevResult
        }
        return { members: [] }
    }

    const remainingSlots = DM_THRESHOLD - spaceRelatedDMChannels.length

    const usersInDMs = new Set(spaceRelatedDMChannels.flatMap((dm) => dm.userIds))

    const eligibleUsers = memberIds
        .reduce<MemberNotInDms[]>((acc, id) => {
            // Stop early if we have enough
            if (acc.length >= remainingSlots) {
                return acc
            }
            if (!usersInDMs.has(id)) {
                const latestEventMs = latestEventByUser[id]?.createdAtEpochMs ?? 0
                acc.push({
                    id,
                    latestEventMs,
                })
            }
            return acc
        }, [])
        .sort((a, b) => b.latestEventMs - a.latestEventMs)

    if (prevResult && isEqual(prevResult.members, eligibleUsers)) {
        return prevResult
    }

    return { members: eligibleUsers }
}
