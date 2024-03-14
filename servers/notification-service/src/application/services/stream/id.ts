import { streamIdAsString } from './utils'

// Original list of StreamPrefix is in river/core/sdk/src/id.ts
export enum StreamPrefix {
    Channel = '20',
    DM = '88',
    GDM = '77',
}

export const isDMChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.DM)
