import { streamIdAsString } from './utils'

// Original list of StreamPrefix is in river/core/sdk/src/id.ts
export enum StreamPrefix {
    Channel = '20',
    DM = '88',
    GDM = '77',
}

export const isDMChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.DM)

export const isGDMChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.GDM)

export const isChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.Channel)
