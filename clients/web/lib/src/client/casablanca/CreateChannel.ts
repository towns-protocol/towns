import { Client as CasablancaClient } from '@towns/sdk'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: CasablancaStreamIdentifier,
    networkId: string,
): Promise<CasablancaStreamIdentifier> {
    const { streamId } = await client.createChannel(spaceId.networkId, networkId)
    await client.waitForStream(streamId)
    return makeCasablancaStreamIdentifier(streamId)
}
