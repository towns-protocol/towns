import { ZionClient } from '../../client/ZionClient'
import { SpaceItem } from '../../types/zion-types'
import { RoomIdentifier } from '../../types/room-identifier'
import { useMatrixSpaces } from '../MatrixClient/useMatrixSpaces'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'

export function useSpaces(
    client: ZionClient | undefined,
    spaceIds: RoomIdentifier[],
): {
    spaces: SpaceItem[]
} {
    const matrixSpaces = useMatrixSpaces(spaceIds, client?.matrixClient)
    const casablancaSpaces = useCasablancaSpaces(spaceIds, client?.casablancaClient)
    const spaces = matrixSpaces.concat(casablancaSpaces)
    return { spaces }
}
