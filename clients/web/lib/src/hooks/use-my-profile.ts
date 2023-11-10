import { useMyUserId } from './use-my-user-id'

import { useUser } from './use-user'

export function useMyProfile() {
    const userId = useMyUserId()
    return useUser(userId)
}
