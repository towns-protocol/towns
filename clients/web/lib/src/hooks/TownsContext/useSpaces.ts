import { TownsOpts } from '../../client/TownsClientTypes'
import { SpaceItem } from '../../types/towns-types'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@towns-protocol/sdk'

export function useSpaces(
    opts: TownsOpts,
    spaceIds: string[],
    casablancaClient: CasablancaClient | undefined,
): {
    spaces: SpaceItem[]
} {
    const casablancaSpaces = useCasablancaSpaces(opts, spaceIds, casablancaClient)
    return { spaces: casablancaSpaces }
}
