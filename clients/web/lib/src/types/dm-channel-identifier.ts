import { ChannelProperties } from '@river/proto'

export type DMChannelIdentifier = {
    id: string
    joined: boolean
    left: boolean
    userIds: string[]
    properties?: ChannelProperties
    lastEventCreatedAtEpochMs: bigint
    isGroup: boolean
}
