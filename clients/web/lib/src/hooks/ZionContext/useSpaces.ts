import { SpaceItem } from '../../types/zion-types'
import { useMatrixSpaces } from '../MatrixClient/useMatrixSpaces'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@towns/sdk'

export function useSpaces(
    matrixClient: MatrixClient | undefined,
    casablancaClient: CasablancaClient | undefined,
): {
    spaces: SpaceItem[]
} {
    const matrixSpaces = useMatrixSpaces(matrixClient)
    const casablancaSpaces = useCasablancaSpaces(casablancaClient)
    const spaces = matrixSpaces.concat(casablancaSpaces)
    return { spaces }
}
