import { isDMChannelStreamId, isGDMChannelStreamId } from '@towns-protocol/sdk'

export const useChannelType = (roomIdentifier: string): 'gdm' | 'dm' | 'channel' => {
    const streamId = roomIdentifier ?? ''
    return isDMChannelStreamId(streamId) ? 'dm' : isGDMChannelStreamId(streamId) ? 'gdm' : 'channel'
}
