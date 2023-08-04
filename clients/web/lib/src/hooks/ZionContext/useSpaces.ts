import { SpaceItem } from '../../types/zion-types'
import { useMatrixSpaces } from '../MatrixClient/useMatrixSpaces'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@river/sdk'
import { useMemo } from 'react'

export function useSpaces(
    matrixClient: MatrixClient | undefined,
    casablancaClient: CasablancaClient | undefined,
): {
    spaces: SpaceItem[]
} {
    const matrixSpaces = useMatrixSpaces(matrixClient)
    const casablancaSpaces = useCasablancaSpaces(casablancaClient)
    const spaces = useMemo(
        () => matrixSpaces.concat(casablancaSpaces),
        [casablancaSpaces, matrixSpaces],
    )
    return { spaces }
}
