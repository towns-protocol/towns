import type { Member, Myself, SyncAgent } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

const getMyMember = (sync: SyncAgent, streamId: string) => getRoom(sync, streamId).members.myself

/**
 * Hook to get the data of the current user in a stream.
 * @param streamId - The id of the stream to get the current user of.
 * @param config - Configuration options for the observable. @see {@link ObservableConfig.FromObservable}
 * @returns The {@link MemberModel} of the current user.
 */
export const useMyMember = (streamId: string, config?: ObservableConfig.FromObservable<Member>) => {
    const sync = useSyncAgent()
    const myself = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { data } = useObservable(myself.member, config)
    return {
        ...data,
    }
}

/**
 * Hook to set the ENS address of the current user in a stream.
 * You should be validating if the ENS address belongs to the user before setting it.
 * @param streamId - The id of the stream to set the ENS address of.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The `setEnsAddress` action and its loading state.
 */
export const useSetEnsAddress = (
    streamId: string,
    config?: ActionConfig<Myself['setEnsAddress']>,
) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setEnsAddress, ...rest } = useAction(member, 'setEnsAddress', config)
    return { setEnsAddress, ...rest }
}

/**
 * Hook to set the username of the current user in a stream.
 * @param streamId - The id of the stream to set the username of.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The `setUsername` action and its loading state.
 */
export const useSetUsername = (streamId: string, config?: ActionConfig<Myself['setUsername']>) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setUsername, ...rest } = useAction(member, 'setUsername', config)
    return { setUsername, ...rest }
}

/**
 * Hook to set the display name of the current user in a stream.
 * @param streamId - The id of the stream to set the display name of.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The `setDisplayName` action and its loading state.
 */
export const useSetDisplayName = (
    streamId: string,
    config?: ActionConfig<Myself['setDisplayName']>,
) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setDisplayName, ...rest } = useAction(member, 'setDisplayName', config)
    return { setDisplayName, ...rest }
}

/**
 * Hook to set the NFT of the current user in a stream.
 * You should be validating if the NFT belongs to the user before setting it.
 * @param streamId - The id of the stream to set the NFT of.
 * @param config - Configuration options for the action. @see {@link ActionConfig}
 * @returns The `setNft` action and its loading state.
 */
export const useSetNft = (streamId: string, config?: ActionConfig<Myself['setNft']>) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setNft, ...rest } = useAction(member, 'setNft', config)
    return { setNft, ...rest }
}
