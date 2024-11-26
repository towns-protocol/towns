import type { Dms } from '@river-build/sdk'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

/**
 * Hook to get the direct messages of the current user.
 * @param config - Configuration options for the observable.
 * @returns The list of all direct messages stream ids of the current user.
 * @example
 *
 * You can combine this hook with the `useDm`, `useMemberList` and `useMember` hooks to get all direct messages of the current user and render them, showing the name of the other user in the dm:
 *
 * ```tsx
 * import { useDm, useMyMember, useMemberList, useMember } from '@river-build/react-sdk'
 *
 * const AllDms = () => {
 *     const { streamIds } = useUserDms()
 *     return <>{streamIds.map((streamId) => <Dm key={streamId} streamId={streamId} />)}</>
 * }
 *
 * const Dm = ({ streamId }: { streamId: string }) => {
 *     const { data: dm } = useDm(streamId)
 *     const { userId: myUserId } = useMyMember(streamId)
 *     const { data: members } = useMemberList(streamId)
 *     const { userId, username, displayName } = useMember({
 *        streamId,
 *        // We find the other user in the dm by checking the userIds in the member list
 *        // and defaulting to the current user if we don't find one, since a user is able to send a dm to themselves
 *        userId: members.userIds.find((userId) => userId !== sync.userId) || sync.userId,
 *     })
 *     return <span>{userId === myUserId ? 'You' : displayName || username || userId}</span>
 * }
 * ```
 */
export const useUserDms = (config?: ObservableConfig.FromObservable<Dms>) => {
    const { data, ...rest } = useRiver((s) => s.dms, config)
    return { streamIds: data.streamIds, ...rest }
}
