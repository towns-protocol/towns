import { useSpaceId } from './use-space-id'
import { useZionContext } from '../components/ZionContextProvider'

export function useSpaceUnread(): boolean {
    const spaceId = useSpaceId()
    const { spaceUnreads } = useZionContext()
    if (!spaceId) {
        return false
    }
    return spaceUnreads[spaceId.streamId] ?? false
}
