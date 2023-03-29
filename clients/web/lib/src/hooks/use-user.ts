import { useZionContext } from '../components/ZionContextProvider'
import { User } from '../types/zion-types'
import { useCasablancaUser } from './CasablancClient/useCasablancaUser'
import { useMatrixUser } from './MatrixClient/useMatrixUser'

export function useUser(userId?: string): User | undefined {
    const { matrixClient, casablancaClient } = useZionContext()
    const matrixUser = useMatrixUser(userId, matrixClient)
    const casablancaUser = useCasablancaUser(userId, casablancaClient)

    return matrixUser ?? casablancaUser
}
