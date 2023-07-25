import { utils } from 'ethers'
import { nanoid } from 'nanoid'
import { check } from './check'
import { bin_toHexString } from './binary'

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
    User = '00-',
    Space = '11-',
    Channel = '22-',
    UserDevice = '33-',
    UserSettings = '44-',
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

export const makeSpaceStreamId = (identity: string): string =>
    makeStreamId(StreamPrefix.Space, identity)

export const makeChannelStreamId = (identity: string): string =>
    makeStreamId(StreamPrefix.Channel, identity)

export const makeUniqueSpaceStreamId = (): string => makeStreamId(StreamPrefix.Space, genId())
export const makeUniqueChannelStreamId = (): string => makeStreamId(StreamPrefix.Channel, genId())

export const isUserStreamId = (streamId: string): boolean => streamId.startsWith(StreamPrefix.User)
export const isSpaceStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.Space)
export const isChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(StreamPrefix.Channel)

export const isValidStreamId = (streamId: string): boolean =>
    allowedStreamPrefixes().some((prefix) => streamId.startsWith(prefix))

export const genId = (): string => {
    return nanoid()
}

const textEncoder = new TextEncoder()
export const genIdBlob = (): Uint8Array => textEncoder.encode(genId())
