import { utils } from 'ethers'
import { nanoid, customAlphabet } from 'nanoid'
import { bin_fromHexString, bin_toHexString, check } from '@river/dlog'
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
    Channel = '20',
    DM = '88',
    GDM = '77',
    Media = 'ff',
    Space = '10',
    User = 'a8',
    UserDevice = 'ad',
    UserInbox = 'a1',
    UserSettings = 'a5',
}

const allowedStreamPrefixesVar = Object.values(StreamPrefix)

export const allowedStreamPrefixes = (): string[] => allowedStreamPrefixesVar

const expectedIdentityLenByPrefix: { [key in StreamPrefix]: number } = {
    [StreamPrefix.User]: 40,
    [StreamPrefix.Space]: 62,
    [StreamPrefix.Channel]: 62,
    [StreamPrefix.UserDevice]: 40,
    [StreamPrefix.UserSettings]: 40,
    [StreamPrefix.Media]: 62,
    [StreamPrefix.DM]: 62,
    [StreamPrefix.GDM]: 62,
    [StreamPrefix.UserInbox]: 40,
}

export const makeStreamId = (prefix: StreamPrefix, identity: string): string => {
    identity = identity.toLowerCase()
    if (identity.startsWith('0x')) {
        identity = identity.slice(2)
    }
    check(
        areValidStreamIdParts(prefix, identity),
        'Invalid stream id parts: ' + prefix + ' ' + identity,
    )
    return prefix + identity
}

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

export const makeUserInboxStreamId = (userId: string | Uint8Array): string => {
    check(isUserId(userId), 'Invalid user id: ' + userId.toString())
    return makeStreamId(
        StreamPrefix.UserInbox,
        userId instanceof Uint8Array ? userIdFromAddress(userId) : userId,
    )
}

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
    return makeStreamId(StreamPrefix.DM, hashed.slice(0, 62))
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
export const isUserInboxStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.UserInbox)

export const areValidStreamIdParts = (prefix: StreamPrefix, identity: string): boolean => {
    return (
        allowedStreamPrefixesVar.includes(prefix) &&
        identity.length === expectedIdentityLenByPrefix[prefix] &&
        /^[0-9a-f]*$/.test(identity)
    )
}

export const isValidStreamId = (streamId: string): boolean => {
    return areValidStreamIdParts(streamId.slice(0, 2) as StreamPrefix, streamId.slice(2))
}

export const checkStreamId = (streamId: string): void => {
    check(isValidStreamId(streamId), 'Invalid stream id: ' + streamId)
}

const hexNanoId = customAlphabet('0123456789abcdef', 62)

export const genId = (): string => {
    return hexNanoId()
}

export const genShortId = (): string => {
    return nanoid(12)
}

export const genLocalId = (): string => {
    return '~' + nanoid(11)
}

export const genIdBlob = (): Uint8Array => bin_fromHexString(hexNanoId(32))
