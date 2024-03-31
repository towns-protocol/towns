import { TownsOpts } from '../../client/TownsClientTypes'
import { SpaceItem } from '../../types/towns-types'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'

export function useSpaces(
    opts: TownsOpts,
    casablancaClient: CasablancaClient | undefined,
): {
    spaces: SpaceItem[]
} {
    const casablancaSpaces = useCasablancaSpaces(opts, casablancaClient)
    return { spaces: casablancaSpaces }
}
