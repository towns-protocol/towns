import { Member } from '@river-build/sdk'
import { useMemo } from 'react'
import { useObservable } from './useObservable'

import type { ObservableConfig } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

export const useMember = (
    props: { streamId: string; userId: string },
    config?: ObservableConfig.FromObservable<Member>,
) => {
    const sync = useSyncAgent()
    const member = useMemo(
        () => getRoom(sync, props.streamId).members.get(props.userId),
        [sync, props],
    )
    const { data, ...rest } = useObservable(member, config)
    return {
        ...data,
        ...rest,
    }
}
