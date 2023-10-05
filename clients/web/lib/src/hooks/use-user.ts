import { useZionContext } from '../components/ZionContextProvider'
import { User } from '../types/zion-types'
import { useCasablancaUser } from './CasablancClient/useCasablancaUser'

export function useUser(userId?: string): User | undefined {
    const { casablancaClient } = useZionContext()
    const casablancaUser = useCasablancaUser(userId, casablancaClient)
    return casablancaUser
}
