import { SpaceItem } from '../../types/zion-types'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'

export function useSpaces(casablancaClient: CasablancaClient | undefined): {
    spaces: SpaceItem[]
} {
    const casablancaSpaces = useCasablancaSpaces(casablancaClient)
    return { spaces: casablancaSpaces }
}
