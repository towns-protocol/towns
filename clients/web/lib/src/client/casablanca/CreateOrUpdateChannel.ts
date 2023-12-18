import { PlainMessage } from '@bufbuild/protobuf'
import { Client as CasablancaClient } from '@river/sdk'
import { RoomIdentifier, makeRoomIdentifier } from '../../types/room-identifier'
import { StreamSettings } from '@river/proto'

export async function createCasablancaChannel(
    client: CasablancaClient,
    spaceId: RoomIdentifier,
    channelName: string,
    channelTopic: string,
    networkId: string,
    streamSettings?: PlainMessage<StreamSettings>,
): Promise<RoomIdentifier> {
    const { streamId } = await client.createChannel(
        spaceId.streamId,
        channelName,
        channelTopic,
        networkId,
        streamSettings,
    )
    await client.waitForStream(streamId)
    return makeRoomIdentifier(streamId)
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
