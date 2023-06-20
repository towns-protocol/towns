import { useZionContext } from '../components/ZionContextProvider'
import { User } from '../types/zion-types'
import { useUser } from './use-user'

export function useMyProfile(): User | undefined {
    const context = useZionContext()
    let userId = context.casablancaClient?.userId
        ? context.casablancaClient?.userId
        : context.matrixClient?.credentials?.userId

    if (!userId) {
        userId = undefined
    }

    return useUser(userId)
}
