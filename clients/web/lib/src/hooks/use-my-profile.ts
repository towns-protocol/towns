import { User } from '../types/zion-types'
import { useMyUserId } from './use-my-user-id'

import { useUser } from './use-user'

export function useMyProfile(): User | undefined {
    const userId = useMyUserId()
    return useUser(userId)
}
