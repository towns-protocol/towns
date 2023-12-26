import { ChannelProperties } from '@river/proto'
import { RoomIdentifier } from './room-identifier'

export type DMChannelIdentifier = {
    id: RoomIdentifier
    joined: boolean
    left: boolean
    userIds: string[]
    properties?: ChannelProperties
    lastEventCreatedAtEpocMs: bigint
    isGroup: boolean
}
