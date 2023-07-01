import { PlainMessage, protoBase64 } from '@bufbuild/protobuf'
import {
    StreamEvent,
    Envelope,
    ChannelMessage,
    ChannelMessage_Post_Content_Text,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_UserDeviceKey,
    UserPayload_Inception,
    SpacePayload_Inception,
    ChannelPayload_Inception,
    UserSettingsPayload_Inception,
    Membership,
    UserPayload_ToDevice,
    SpacePayload_Channel,
    ChannelPayload_Message,
    ToDeviceMessage,
    ToDeviceOp,
    ToDeviceMessage_KeyRequest,
    ToDeviceMessage_KeyResponse,
    UserPayload_UserMembership,
} from '@towns/proto'
import {
    bytesToHex,
    bytesToUtf8,
    equalsBytes,
    hexToBytes,
    utf8ToBytes,
} from 'ethereum-cryptography/utils'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { isDefined } from './check'
import { ISignatures } from './crypto/deviceInfo'

export interface ParsedEvent {
    event: StreamEvent
    envelope: Envelope
    hashStr: string
    prevEventsStrs: string[]
    creatorUserId: string
}

export interface IDeviceKeySignatures {
    [keyId: string]: string
}

export interface ISigned {
    signatures?: ISignatures
}

export interface IDeviceKeys {
    algorithms: Array<string>
    keys: Record<string, string>
    signatures?: IDeviceKeySignatures
}
export interface IFallbackKey {
    key: string
    fallback?: boolean
    signatures?: IDeviceKeySignatures
}

export const bin_fromBase64 = (base64String: string): Uint8Array => {
    return protoBase64.dec(base64String)
}

export const bin_toBase64 = (uint8Array: Uint8Array): string => {
    return protoBase64.enc(uint8Array)
}
export const bin_fromHexString = (hexString: string): Uint8Array => {
    return hexToBytes(hexString)
}

export const bin_toHexString = (uint8Array: Uint8Array): string => {
    return bytesToHex(uint8Array)
}

export const bin_fromString = (str: string): Uint8Array => {
    return utf8ToBytes(str)
}

export const bin_toString = (buf: Uint8Array): string => {
    return bytesToUtf8(buf)
}

export const takeKeccakFingerprintInHex = (buf: Uint8Array, n: number): string => {
    const hash = bin_toHexString(keccak256(buf))
    return hash.slice(0, n)
}

export const shortenHexString = (s: string): string => {
    if (s.startsWith('0x')) {
        return s.length > 12 ? s.slice(0, 6) + '..' + s.slice(-4) : s
    } else {
        return s.length > 10 ? s.slice(0, 4) + '..' + s.slice(-4) : s
    }
}

export const isHexString = (value: string): boolean => {
    if (value.length === 0 || (value.length & 1) !== 0) {
        return false
    }
    return /^(0x)?[0-9a-fA-F]+$/.test(value)
}

export const bin_equal = (
    a: Uint8Array | null | undefined,
    b: Uint8Array | null | undefined,
): boolean => {
    if ((!isDefined(a) || a.length === 0) && (!isDefined(b) || b.length === 0)) {
        return true
    } else if (!isDefined(a) || !isDefined(b)) {
        return false
    }
    return equalsBytes(a, b)
}

export const make_UserPayload_Inception = (
    value: PlainMessage<UserPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}
export const make_SpacePayload_Inception = (
    value: PlainMessage<SpacePayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'spacePayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}
export const make_ChannelPayload_Inception = (
    value: PlainMessage<ChannelPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}
export const make_UserSettingsPayload_Inception = (
    value: PlainMessage<UserSettingsPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userSettingsPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_UserDeviceKeyPayload_Inception = (
    value: PlainMessage<UserDeviceKeyPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userDeviceKeyPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_SpacePayload_Membership = (
    value: PlainMessage<Membership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'spacePayload',
        value: {
            content: {
                case: 'membership',
                value,
            },
        },
    }
}

export const make_ChannelPayload_Membership = (
    value: PlainMessage<Membership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'membership',
                value,
            },
        },
    }
}

export const make_UserPayload_ToDevice = (
    value: PlainMessage<UserPayload_ToDevice>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userPayload',
        value: {
            content: {
                case: 'toDevice',
                value,
            },
        },
    }
}

export const make_UserDeviceKeyPayload_UserDeviceKey = (
    value: PlainMessage<UserDeviceKeyPayload_UserDeviceKey>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userDeviceKeyPayload',
        value: {
            content: {
                case: 'userDeviceKey',
                value,
            },
        },
    }
}

export const make_SpacePayload_Channel = (
    value: PlainMessage<SpacePayload_Channel>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'spacePayload',
        value: {
            content: {
                case: 'channel',
                value,
            },
        },
    }
}

export const getSpaceOrChannelPayload_Membership = (
    event: ParsedEvent | StreamEvent | undefined,
): Membership | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.case === 'spacePayload' || event.payload?.case === 'channelPayload') {
        if (event.payload.value.content.case === 'membership') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const getUserPayload_Membership = (
    event: ParsedEvent | StreamEvent | undefined,
): UserPayload_UserMembership | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.case === 'userPayload') {
        if (event.payload.value.content.case === 'userMembership') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const getChannelPayload = (
    event: ParsedEvent | StreamEvent | undefined,
): SpacePayload_Channel | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.case === 'spacePayload') {
        if (event.payload.value.content.case === 'channel') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const make_ChannelPayload_Message = (
    value: PlainMessage<ChannelPayload_Message>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'message',
                value,
            },
        },
    }
}

export const getMessagePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): ChannelPayload_Message | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.case === 'channelPayload') {
        if (event.payload.value.content.case === 'message') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const getToDevicePayloadContent = (
    payload: UserPayload_ToDevice,
): ToDeviceMessage_KeyRequest | ToDeviceMessage_KeyResponse | undefined => {
    const decoder = new TextDecoder()
    const decodedPayload = decoder.decode(payload?.value)
    let content: ToDeviceMessage_KeyRequest | ToDeviceMessage_KeyResponse | undefined = undefined
    switch (ToDeviceOp[payload.op]) {
        case ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST]: {
            content = ToDeviceMessage_KeyRequest.fromJsonString(decodedPayload)
            return content
        }
        case ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE]: {
            content = ToDeviceMessage_KeyRequest.fromJsonString(decodedPayload)
            return content
        }
        default:
            break
    }
    return content
}

export const getToDevicePayloadContentFromEvent = (
    event: ParsedEvent | StreamEvent | undefined,
): ToDeviceMessage | undefined => {
    const payload = getToDeviceMessagePayload(event)
    if (!payload) {
        return undefined
    }
    return ToDeviceMessage.fromBinary(payload.value)
}

export const getToDevicePayloadContentFromJsonString = (
    payload: string,
): ToDeviceMessage | undefined => {
    return ToDeviceMessage.fromJsonString(payload)
}

export const getToDeviceMessagePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): UserPayload_ToDevice | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload.case === 'userPayload') {
        if (event.payload.value.content.case === 'toDevice') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const getUserDeviceKeyMessagePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): UserDeviceKeyPayload_UserDeviceKey | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload.case === 'userDeviceKeyPayload') {
        if (event.payload.value.content.case === 'userDeviceKey') {
            return event.payload.value.content.value
        }
    }
    return undefined
}

export const getMessagePayloadContent = (
    event: ParsedEvent | StreamEvent | undefined,
): ChannelMessage | undefined => {
    const payload = getMessagePayload(event)
    if (!payload) {
        return undefined
    }
    return ChannelMessage.fromJsonString(payload.text)
}

export const getMessagePayloadContent_Text = (
    event: ParsedEvent | StreamEvent | undefined,
): ChannelMessage_Post_Content_Text | undefined => {
    const content = getMessagePayloadContent(event)
    if (!content) {
        return undefined
    }
    if (content.payload.case !== 'post') {
        throw new Error('Expected post message')
    }
    if (content.payload.value.content.case !== 'text') {
        throw new Error('Expected text message')
    }
    return content.payload.value.content.value
}

function processMapToObjectValue(value: any): any {
    if (value instanceof Map) {
        return recursiveMapToObject(value)
    } else if (Array.isArray(value)) {
        // TODO: tighten this return type
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value.map((v) => processMapToObjectValue(v))
    } else {
        return value
    }
}

export function recursiveMapToObject(map: Map<any, any>): Record<any, any> {
    const targetMap = new Map()

    for (const [key, value] of map) {
        targetMap.set(key, processMapToObjectValue(value))
    }

    // TODO: tighten this return type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Object.fromEntries(targetMap.entries())
}
