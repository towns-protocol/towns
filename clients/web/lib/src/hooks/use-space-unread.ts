import { useSpaceId } from './use-space-id'
import { useTownsContext } from '../components/TownsContextProvider'

export function useSpaceUnread(): boolean {
    const spaceId = useSpaceId()
    const { spaceUnreads } = useTownsContext()
    if (!spaceId) {
        return false
    }
    return spaceUnreads[spaceId] ?? false
}
