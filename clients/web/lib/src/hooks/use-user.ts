import { useZionContext } from '../components/ZionContextProvider'
import { User } from '../types/zion-types'
import { useCasablancaUser } from './CasablancClient/useCasablancaUser'
import { useMatrixUser } from './MatrixClient/useMatrixUser'

export function useUser(userId?: string): User | undefined {
    const { client } = useZionContext()
    const matrixUser = useMatrixUser(userId, client?.matrixClient)
    const casablancaUser = useCasablancaUser(userId, client?.casablancaClient)

    return matrixUser ?? casablancaUser
}
