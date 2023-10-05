import { SpaceItem } from '../../types/zion-types'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@river/sdk'

export function useSpaces(
    matrixClient: MatrixClient | undefined,
    casablancaClient: CasablancaClient | undefined,
): {
    spaces: SpaceItem[]
} {
    const casablancaSpaces = useCasablancaSpaces(casablancaClient)
    return { spaces: casablancaSpaces }
}
