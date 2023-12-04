import { utils } from 'ethers'
import { nanoid } from 'nanoid'
import { check } from './check'
import { bin_toHexString } from './binary'
import { hashString } from './utils'

export const userIdFromAddress = (address: Uint8Array): string =>
    utils.getAddress(bin_toHexString(address))

// User id is an Ethereum address.
// In string form it is 42 characters long, should start with 0x and TODO: have ERC-55 checksum.
// In binary form it is 20 bytes long.
export const isUserId = (userId: string | Uint8Array): boolean => {
    if (userId instanceof Uint8Array) {
        return userId.length === 20
    } else if (typeof userId === 'string') {
        return utils.isAddress(userId)
    }
    return false
}

// reason about data in logs, tests, etc.
export enum StreamPrefix {
    User = 'USER-',
    Space = 'SPCE-',
    Channel = 'CHAN-',
    UserDevice = 'UDKS-',
    UserSettings = 'USET-',
    Media = 'BLOB-',
    DM = 'DMDM-',
    GDM = 'GDMS-',
    UserToDevice = 'UDEV-',
}

export const allowedStreamPrefixes = (): string[] => Object.values(StreamPrefix)

export const makeStreamId = (prefix: StreamPrefix, identity: string): string => prefix + identity

export const makeUserStreamId = (userId: string | Uint8Array): string => {
    check(isUserId(userId), 'Invalid user id: ' + userId.toString())
    return makeStreamId(
        StreamPrefix.User,
        userId instanceof Uint8Array ? userIdFromAddress(userId) : userId,
    )
}

export const makeUserSettingsStreamId = (userId: string | Uint8Array): string => {
    check(isUserId(userId), 'Invalid user id: ' + userId.toString())
    return makeStreamId(
        StreamPrefix.UserSettings,
        userId instanceof Uint8Array ? userIdFromAddress(userId) : userId,
    )
}

export const makeUserDeviceKeyStreamId = (userId: string | Uint8Array): string => {
    check(isUserId(userId), 'Invalid user id: ' + userId.toString())
    return makeStreamId(
        StreamPrefix.UserDevice,
        userId instanceof Uint8Array ? userIdFromAddress(userId) : userId,
    )
}

export const makeUserToDeviceStreamId = (userId: string | Uint8Array): string => {
    check(isUserId(userId), 'Invalid user id: ' + userId.toString())
    return makeStreamId(
        StreamPrefix.UserToDevice,
        userId instanceof Uint8Array ? userIdFromAddress(userId) : userId,
    )
}

export const makeSpaceStreamId = (identity: string): string =>
    makeStreamId(StreamPrefix.Space, identity)

export const makeChannelStreamId = (identity: string): string =>
    makeStreamId(StreamPrefix.Channel, identity)

export const makeUniqueSpaceStreamId = (): string => makeStreamId(StreamPrefix.Space, genId())
export const makeUniqueChannelStreamId = (): string => makeStreamId(StreamPrefix.Channel, genId())
export const makeUniqueGDMChannelStreamId = (): string => makeStreamId(StreamPrefix.GDM, genId())
export const makeUniqueMediaStreamId = (): string => makeStreamId(StreamPrefix.Media, genId())

export const makeDMStreamId = (userIdA: string, userIdB: string): string => {
    const concatenated = [userIdA, userIdB]
        .map((id) => id.toLowerCase())
        .sort()
        .join('-')
    const hashed = hashString(concatenated)
    return makeStreamId(StreamPrefix.DM, hashed)
}

export const isUserStreamId = (streamId: string): boolean => streamId.startsWith(StreamPrefix.User)
export const isSpaceStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.Space)
export const isChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.Channel)
export const isDMChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.DM)
export const isUserDeviceStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.UserDevice)
export const isUserSettingsStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.UserSettings)
export const isMediaStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.Media)
export const isGDMChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.GDM)
export const isValidStreamId = (streamId: string): boolean =>
    allowedStreamPrefixes().some((prefix) => streamId.startsWith(prefix))

export const getStreamPayloadCase = (streamId: string): string | undefined => {
    if (!isValidStreamId(streamId)) {
        return undefined
    }
    if (isUserStreamId(streamId)) {
        return 'userPayload'
    } else if (isChannelStreamId(streamId)) {
        return 'channelPayload'
    } else if (isDMChannelStreamId(streamId)) {
        return 'dmChannelPayload'
    } else if (isGDMChannelStreamId(streamId)) {
        return 'gdmChannelPayload'
    } else if (isSpaceStreamId(streamId)) {
        return 'spacePayload'
    } else if (isMediaStreamId(streamId)) {
        return 'mediaPayload'
    } else if (isUserSettingsStreamId(streamId)) {
        return 'userSettingsPayload'
    } else if (isUserDeviceStreamId(streamId)) {
        return 'userDevicePayload'
    }
    return
}
export const genId = (): string => {
    return nanoid()
}

export const genShortId = (): string => {
    return nanoid(12)
}

export const genLocalId = (): string => {
    return '~' + nanoid(11)
}

const textEncoder = new TextEncoder()
export const genIdBlob = (): Uint8Array => textEncoder.encode(genId())
