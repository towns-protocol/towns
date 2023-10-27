import { RoomIdentifier } from 'use-zion-client'
import { isDMChannelStreamId } from '@river/sdk'

export const useChannelType = (roomIdentifier: RoomIdentifier): 'dm' | 'channel' => {
    return isDMChannelStreamId(roomIdentifier?.networkId ?? '') ? 'dm' : 'channel'
}
