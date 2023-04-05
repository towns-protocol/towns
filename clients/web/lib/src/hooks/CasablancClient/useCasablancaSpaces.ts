import { Client as CasablancaClient } from '@towns/sdk'
import { SpaceItem } from '../../types/zion-types'
import { useSpaceIdStore } from '../../hooks/ZionContext/useSpaceIds'

export function useCasablancaSpaces(casablancaClient?: CasablancaClient): SpaceItem[] {
    const { spaceIds } = useSpaceIdStore()
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (spaceIds.length === 0 || !casablancaClient) {
        return []
    }
    return []
}
