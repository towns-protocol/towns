import { User } from '../types/matrix-types'
import { useMatrixCredentials } from './use-matrix-credentials'
import { useUser } from './use-user'

export function useMyProfile(): User | undefined {
    const { userId } = useMatrixCredentials()
    return useUser(userId)
}
