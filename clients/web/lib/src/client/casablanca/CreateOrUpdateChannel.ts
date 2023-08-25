import { PlainMessage } from '@bufbuild/protobuf'
import { Client as CasablancaClient } from '@river/sdk'
import {
    CasablancaStreamIdentifier,
    makeCasablancaStreamIdentifier,
} from '../../types/room-identifier'
import { StreamSettings } from '@river/proto'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: CasablancaStreamIdentifier,
    channelName: string,
    channelTopic: string,
    networkId: string,
    streamSettings?: PlainMessage<StreamSettings>,
): Promise<CasablancaStreamIdentifier> {
    const { streamId } = await client.createChannel(
        spaceId.networkId,
        channelName,
        channelTopic,
        networkId,
        streamSettings,
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
