import { RoomIdentifier } from 'use-zion-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'

export const useChannelType = (roomIdentifier: RoomIdentifier): 'dm' | 'channel' => {
    const streamId = roomIdentifier?.networkId ?? ''
    return isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId) ? 'dm' : 'channel'
}
