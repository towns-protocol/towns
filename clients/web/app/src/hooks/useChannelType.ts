import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'

export const useChannelType = (roomIdentifier: string): 'gdm' | 'dm' | 'channel' => {
    const streamId = roomIdentifier ?? ''
    return isDMChannelStreamId(streamId) ? 'dm' : isGDMChannelStreamId(streamId) ? 'gdm' : 'channel'
}
