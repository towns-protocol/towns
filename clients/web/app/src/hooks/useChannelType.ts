import { RoomIdentifier } from 'use-zion-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'

export const useChannelType = (roomIdentifier: RoomIdentifier): 'gdm' | 'dm' | 'channel' => {
    const streamId = roomIdentifier?.streamId ?? ''
    return isDMChannelStreamId(streamId) ? 'dm' : isGDMChannelStreamId(streamId) ? 'gdm' : 'channel'
}
