import { useMemo } from 'react'
import type { MembersModel } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to get the members userIds of a Space, GDM, Channel, or DM.
 * Used with useMember to get data from a specific member.
 * @param streamId - The id of the stream to get the members of.
 * @param config - Configuration options for the observable.
 * @returns The MembersModel of the stream, containing the userIds of the members.
 */
export const useMemberList = (
    streamId: string,
    config?: ObservableConfig.FromData<MembersModel>,
) => {
    const sync = useSyncAgent()
    const members = useMemo(() => getRoom(sync, streamId).members, [sync, streamId])
    return useObservable(members, config)
}
