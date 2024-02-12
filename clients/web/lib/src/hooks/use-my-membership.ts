import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Membership, toMembership } from '../types/zion-types'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'

/**
 * useMyMembership is different than useMembership in that it uses the userStream to determine the membership
 * we drive our UI off of the userStream, and join and leave channels by submitting userStream events
 * so this is the correct way to determine membership
 * @param streamId
 * @returns Membership
 */
export function useMyMembership(streamId?: string): Membership {
    const { casablancaClient } = useZionContext()
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)
    const [membership, setMembership] = useState<Membership>(Membership.None)

    useEffect(() => {
        if (!userStream || !streamId) {
            return
        }
        const updateMember = () => {
            const membershipOp = userStream.view.userContent.streamMemberships[streamId]?.op
            const membership = toMembership(membershipOp)
            setMembership(membership)
        }

        updateMember()

        const onUserStreamUpdate = (_streamId: string) => {
            updateMember()
        }

        userStream.on('userStreamMembershipChanged', onUserStreamUpdate)
        userStream.on('streamInitialized', onUserStreamUpdate)

        return () => {
            userStream.off('userStreamMembershipChanged', onUserStreamUpdate)
            userStream.off('streamInitialized', onUserStreamUpdate)
        }
    }, [streamId, userStream])

    return membership
}
