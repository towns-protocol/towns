import { useZionContext } from '../components/ZionContextProvider'
import { Membership } from '../types/zion-types'
import { useMembership } from './use-membership'

export function useMyMembership(inRoomId?: string): Membership {
    const { casablancaClient } = useZionContext()
    const userId = casablancaClient?.userId
    return useMembership(inRoomId, userId)
}
