import { Client as CasablancaClient } from '@river/sdk'
import { RoomIdentifier, makeRoomIdentifier } from '../../types/room-identifier'

export async function createCasablancaSpace(
    casablancaClient: CasablancaClient,
    networkId: string | undefined,
): Promise<RoomIdentifier> {
    const result = await casablancaClient.createSpace(networkId)
    await casablancaClient.waitForStream(result.streamId)
    return makeRoomIdentifier(result.streamId)
}
