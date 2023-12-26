import { ChannelProperties } from '@river/proto'

export type DMChannelIdentifier = {
    id: string
    joined: boolean
    left: boolean
    userIds: string[]
    properties?: ChannelProperties
    lastEventCreatedAtEpocMs: bigint
    isGroup: boolean
}
