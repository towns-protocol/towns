import { Member } from '@river-build/sdk'
import { useMemo } from 'react'
import { useObservable } from './useObservable'

import type { ObservableConfig } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

/**
 * Hook to get data from a specific member of a Space, GDM, Channel, or DM.
 * @param props - The streamId and userId of the member to get data from.
 * @param config - Configuration options for the observable.
 * @returns The Member data.
 */
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
        // Excluding `Member.id` property from the return value, since its a internal store id and can lead to confusion
        userId: data.userId,
        streamId: data.streamId,
        initialized: data.initialized,
        // username
        username: data.username,
        isUsernameConfirmed: data.isUsernameConfirmed,
        isUsernameEncrypted: data.isUsernameEncrypted,
        // displayName
        displayName: data.displayName,
        isDisplayNameEncrypted: data.isDisplayNameEncrypted,
        // ensAddress
        ensAddress: data.ensAddress,
        // nft
        nft: data.nft,
        // membership
        membership: data.membership,
        ...rest,
    }
}
