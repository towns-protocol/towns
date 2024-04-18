import { useSpaceDataStore } from 'use-towns-client'
import { useEffect } from 'react'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

export function MonitorJoinFlow() {
    const { end: endPublicPageLoginFlow, joiningSpace } = usePublicPageLoginFlow()
    const joinedSpace = useSpaceDataStore((s) => s.spaceDataMap?.[joiningSpace ?? 'EMPTY'])

    useEffect(() => {
        if (joinedSpace && joinedSpace.membership === 'join') {
            endPublicPageLoginFlow()
        }
    }, [joiningSpace, joinedSpace, endPublicPageLoginFlow])

    return null
}
