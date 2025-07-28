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
    latestMs: number
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
    //const startTime = performance.now()
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

    const prevResultMap = prevResult?.members.reduce(
        (acc, member) => {
            acc[member.id] = member
            return acc
        },
        {} as Record<string, MemberNotInDms>,
    )

    const eligibleUsers = memberIds
        .reduce<MemberNotInDms[]>((acc, memberId) => {
            // Stop early if we have enough
            if (acc.length >= remainingSlots) {
                return acc
            }
            if (!usersInDMs.has(memberId)) {
                const latestMs = latestEventByUser[memberId]?.createdAtEpochMs ?? 0
                if (prevResultMap?.[memberId]?.latestMs === latestMs) {
                    acc.push(prevResultMap[memberId])
                } else {
                    acc.push({
                        id: memberId,
                        latestMs: latestEventByUser[memberId]?.createdAtEpochMs ?? 0,
                    })
                }
            }
            return acc
        }, [])
        .sort((a, b) => b.latestMs - a.latestMs)

    //const endTime = performance.now()
    //console.log(`!membersNotInDmsTransform took ${endTime - startTime}ms`)

    if (prevResult && isEqual(prevResult.members, eligibleUsers)) {
        return prevResult
    }

    return { members: eligibleUsers }
}
