import { RoomIdentifier } from './room-identifier'

export type DMChannelIdentifier = {
    id: RoomIdentifier
    joined: boolean
    left: boolean
    userIds: string[]
    lastEventCreatedAtEpocMs: bigint
    isGroup: boolean
}
