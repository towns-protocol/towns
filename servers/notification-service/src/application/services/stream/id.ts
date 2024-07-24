import { streamIdAsString } from './utils'

import { StreamPrefix } from '@river-build/sdk'

export const isDMChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.DM)

export const isGDMChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.GDM)

export const isChannelStreamId = (streamId: string | Uint8Array): boolean =>
    streamIdAsString(streamId).startsWith(StreamPrefix.Channel)
