import { useConnectivity, useMyMemberships, useSpaceDataStore } from 'use-towns-client'
import { useEffect } from 'react'
import { Membership } from '@towns-protocol/sdk'
import { SECOND_MS } from 'data/constants'
import { JoinStep, usePublicPageLoginFlow } from './usePublicPageLoginFlow'

export function MonitorJoinFlow() {
    const { end: endPublicPageLoginFlow, spaceBeingJoined, setJoinStep } = usePublicPageLoginFlow()
    const joinedSpace = useSpaceDataStore((s) => s.spaceDataMap?.[spaceBeingJoined ?? 'EMPTY'])
    const memberships = useMyMemberships()
    const { loggedInWalletAddress } = useConnectivity()

    useEffect(() => {
        let step: JoinStep = JoinStep.None
        if (spaceBeingJoined) {
            step = JoinStep.JoinedTown
        }
        if (loggedInWalletAddress && joinedSpace && joinedSpace.membership === 'join') {
            step = JoinStep.JoinedDefaultChannel
            const channels = joinedSpace.channelGroups.flatMap((cg) => cg.channels)
            if (channels.some((c) => memberships[c.id] === Membership.Join)) {
                step = JoinStep.Done
                const timeout = setTimeout(() => {
                    endPublicPageLoginFlow()
                    spaceBeingJoined
                }, SECOND_MS * 2)
                return () => {
                    clearTimeout(timeout)
                }
            }
        }
        if (step) {
            setJoinStep(step)
        }
    }, [
        spaceBeingJoined,
        joinedSpace,
        endPublicPageLoginFlow,
        memberships,
        setJoinStep,
        loggedInWalletAddress,
    ])

    return null
}
