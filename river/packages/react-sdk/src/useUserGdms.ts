import type { Gdms } from '@river-build/sdk/dist/sync-agent/gdms/gdms'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

/**
 * Hook to get the group dm streams of the current user.
 * @param config - Configuration options for the observable.
 * @returns The list of all group dm stream ids of the current user.
 * @example
 * You can combine this hook with the `useGdm` hook to get all group dm streams of the current user and render them:
 *
 * ```tsx
 * import { useUserGdms, useGdm } from '@river-build/react-sdk'
 *
 * const AllGdms = () => {
 *     const { streamIds } = useUserGdms()
 *     return <>{streamIds.map((streamId) => <Gdm key={streamId} streamId={streamId} />)}</>
 * }
 *
 * const Gdm = ({ streamId }: { streamId: string }) => {
 *     const { data: gdm } = useGdm(streamId)
 *     return <div>{gdm.metadata?.name || 'Unnamed Gdm'}</div>
 * }
 * ```
 */
export const useUserGdms = (config?: ObservableConfig.FromObservable<Gdms>) => {
    const { data, ...rest } = useRiver((s) => s.gdms, config)
    return { streamIds: data.streamIds, ...rest }
}
