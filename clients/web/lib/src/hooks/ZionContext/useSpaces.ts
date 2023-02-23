import { ZionClient } from '../../client/ZionClient'
import { SpaceItem } from '../../types/zion-types'
import { useMatrixSpaces } from '../MatrixClient/useMatrixSpaces'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'

export function useSpaces(client: ZionClient | undefined): {
    spaces: SpaceItem[]
} {
    const matrixSpaces = useMatrixSpaces(client?.matrixClient)
    const casablancaSpaces = useCasablancaSpaces(client?.casablancaClient)
    const spaces = matrixSpaces.concat(casablancaSpaces)
    return { spaces }
}
