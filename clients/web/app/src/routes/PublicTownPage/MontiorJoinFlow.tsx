import { Membership, useMyMemberships, useSpaceDataStore } from 'use-towns-client'
import { useEffect } from 'react'
import { SECOND_MS } from 'data/constants'
import { JoinStep, usePublicPageLoginFlow } from './usePublicPageLoginFlow'

export function MonitorJoinFlow() {
    const { end: endPublicPageLoginFlow, joiningSpace, setJoinStep } = usePublicPageLoginFlow()
    const joinedSpace = useSpaceDataStore((s) => s.spaceDataMap?.[joiningSpace ?? 'EMPTY'])
    const memberships = useMyMemberships()

    useEffect(() => {
        let step: JoinStep = JoinStep.None
        if (joiningSpace) {
            step = JoinStep.JoinedTown
        }
        if (joinedSpace && joinedSpace.membership === 'join') {
            step = JoinStep.JoinedDefaultChannel
            const channels = joinedSpace.channelGroups.flatMap((cg) => cg.channels)
            if (channels.some((c) => memberships[c.id] === Membership.Join)) {
                step = JoinStep.Done
                const timeout = setTimeout(() => {
                    endPublicPageLoginFlow()
                }, SECOND_MS * 2)
                return () => {
                    clearTimeout(timeout)
                }
            }
        }
        if (step) {
            setJoinStep(step)
        }
    }, [joiningSpace, joinedSpace, endPublicPageLoginFlow, memberships, setJoinStep])

    return null
}
