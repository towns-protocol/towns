import type { Spaces } from '@towns-protocol/sdk'
import type { ObservableConfig } from './useObservable'
import { useTowns } from './useTowns'

/**
 * Hook to get the spaces of the current user.
 * @param config - Configuration options for the observable.
 * @returns The list of all space ids of the current user.
 * @example
 * You can combine this hook with the `useSpace` hook to get all spaces of the current user and render them:
 *
 * ```tsx
 * import { useUserSpaces, useSpace } from '@towns-protocol/react-sdk'
 *
 * const AllSpaces = () => {
 *     const { spaceIds } = useUserSpaces()
 *     return <>{spaceIds.map((spaceId) => <Space key={spaceId} spaceId={spaceId} />)}</>
 * }
 *
 * const Space = ({ spaceId }: { spaceId: string }) => {
 *     const { data: space } = useSpace(spaceId)
 *     return <div>{space.metadata?.name || 'Unnamed Space'}</div>
 * }
 * ```
 */
export const useUserSpaces = (
    config?: ObservableConfig.FromObservable<Spaces>,
) => {
    const { data, ...rest } = useTowns((s) => s.spaces, config)
    return { spaceIds: data.spaceIds, ...rest }
}
