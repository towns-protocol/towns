import { PlainMessage } from '@bufbuild/protobuf'
import { Client as CasablancaClient } from '@river/sdk'
import { StreamSettings } from '@river/proto'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: string,
    channelName: string,
    channelTopic: string,
    networkId: string,
    streamSettings?: PlainMessage<StreamSettings>,
): Promise<string> {
    const { streamId } = await client.createChannel(
        spaceId,
        channelName,
        channelTopic,
        networkId,
        streamSettings,
    )
    await client.waitForStream(streamId)
    return streamId
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
