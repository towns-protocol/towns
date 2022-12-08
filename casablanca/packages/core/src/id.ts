// Stream kind is set in inception payload explicitely as StreamKind in data.streamKind field.
// Stream ids are prefixed with the kind of the stream to make it easier to

import { nanoid } from 'nanoid'

// reason about data in logs, tests, etc.
export enum SteamPrefix {
    User = 'zuser-',
    Space = 'zspace-',
    Channel = 'zchannel-',
}

export const allowedStreamPrefixes = (): string[] => Object.values(SteamPrefix)

export const makeStreamId = (prefix: SteamPrefix, identity: string): string => prefix + identity

export const makeUserStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.User, identity)
export const makeSpaceStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.Space, identity)
export const makeChannelStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.Channel, identity)

export const makeUniqueSpaceStreamId = (): string => makeStreamId(SteamPrefix.Space, genId())
export const makeUniqueChannelStreamId = (): string => makeStreamId(SteamPrefix.Channel, genId())

export const isUserStreamId = (streamId: string): boolean => streamId.startsWith(SteamPrefix.User)
export const isSpaceStreamId = (streamId: string): boolean => streamId.startsWith(SteamPrefix.Space)
export const isChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(SteamPrefix.Channel)

export const isValidStreamId = (streamId: string): boolean =>
    allowedStreamPrefixes().some((prefix) => streamId.startsWith(prefix))

export const genId = (): string => {
    // TODO: what's up with all this nanoid version problems?
    // 4 doesn't work in node with default imports
    // 3 doesn't work in JSDOM
    return nanoid()
}
