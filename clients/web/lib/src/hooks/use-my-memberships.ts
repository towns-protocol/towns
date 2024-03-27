import { useEffect, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { Membership, toMembership } from '../types/towns-types'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { UserPayload_UserMembership } from '@river-build/proto'
import isEqual from 'lodash/isEqual'

export function useMyMemberships(): Record<string, Membership> {
    const { casablancaClient } = useTownsContext()
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)
    const [memberships, setMemberships] = useState<Record<string, Membership>>({})

    useEffect(() => {
        if (!userStream) {
            return
        }
        const updateMemberships = () => {
            const memberships = Object.entries(
                userStream.view.userContent.streamMemberships,
            ).reduce(
                (acc: Record<string, Membership>, entry: [string, UserPayload_UserMembership]) => {
                    acc[entry[0]] = toMembership(entry[1].op)
                    return acc
                },
                {},
            )
            setMemberships((prev) => {
                if (isEqual(prev, memberships)) {
                    return prev
                }
                return memberships
            })
        }

        updateMemberships()

        const onUserStreamUpdate = (_streamId: string) => {
            updateMemberships()
        }

        userStream.on('userStreamMembershipChanged', onUserStreamUpdate)
        userStream.on('streamInitialized', onUserStreamUpdate)

        return () => {
            userStream.off('userStreamMembershipChanged', onUserStreamUpdate)
            userStream.off('streamInitialized', onUserStreamUpdate)
        }
    }, [userStream])
    return memberships
}
