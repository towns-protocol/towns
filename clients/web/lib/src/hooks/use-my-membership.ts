import { useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { Membership, toMembership } from '../types/towns-types'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Stream } from '@river/sdk'

/**
 * useMyMembership is different than useMembership in that it uses the userStream to determine the membership
 * we drive our UI off of the userStream, and join and leave channels by submitting userStream events
 * so this is the correct way to determine membership
 * @param streamId
 * @returns Membership
 */
export function useMyMembership(streamId?: string): Membership {
    const { casablancaClient } = useTownsContext()
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)

    const [membership, setMembership] = useState<Membership>(() =>
        getMembership(userStream, streamId),
    )

    useEffect(() => {
        if (!userStream || !streamId) {
            return
        }

        const updateMembership = () => {
            setMembership(getMembership(userStream, streamId))
        }

        updateMembership()

        userStream.on('userStreamMembershipChanged', updateMembership)
        userStream.on('streamInitialized', updateMembership)

        return () => {
            userStream.off('userStreamMembershipChanged', updateMembership)
            userStream.off('streamInitialized', updateMembership)
        }
    }, [streamId, userStream])

    return membership
}

const getMembership = (userStream: Stream | undefined, streamId: string | undefined) => {
    const membershipOp = streamId
        ? userStream?.view.userContent.streamMemberships[streamId]?.op
        : undefined
    return toMembership(membershipOp) || Membership.None
}
