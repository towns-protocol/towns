import { Client as CasablancaClient } from '@towns/client'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: CasablancaStreamIdentifier,
): Promise<CasablancaStreamIdentifier> {
    const { streamId } = await client.createChannel(spaceId.networkId)
    await client.waitForStream(streamId)
    return makeCasablancaStreamIdentifier(streamId)
}
