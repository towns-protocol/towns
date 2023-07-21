import { Client as CasablancaClient } from '@towns/sdk'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: CasablancaStreamIdentifier,
    channelName: string,
    channelTopic: string,
    networkId: string,
): Promise<CasablancaStreamIdentifier> {
    const { streamId } = await client.createChannel(
        spaceId.networkId,
        channelName,
        channelTopic,
        networkId,
    )
    await client.waitForStream(streamId)
    return makeCasablancaStreamIdentifier(streamId)
}

export async function updateCasablancaChannel(
    client: CasablancaClient,
    spaceId: string,
    channelName: string,
    channelTopic: string,
    networkId: string,
) {
    await client.updateChannel(spaceId, networkId, channelName, channelTopic)
}
