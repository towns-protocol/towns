import { AnyMessage, Message, PlainMessage, ScalarType, protoBase64 } from '@bufbuild/protobuf'
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

export interface ParsedEvent {
    event: Stringify<StreamEvent>
    envelope: Envelope
    hashStr: string
    creatorUserId: string
}

export interface ISignatures {
    [entity: string]: {
        [keyId: string]: string
    }
}

export interface ISigned {
    signatures?: ISignatures
}

export interface IDeviceKeys {
    algorithms: Array<string>
    keys: Record<string, string>
    signatures?: ISignatures
}
export interface IFallbackKey {
    key: string
    fallback?: boolean
    signatures?: ISignatures
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

type OneofSelectedMessage<K extends string, M extends Message<M>> = {
    case: K
    value: M
}
type Stringify1<T extends Message<T>> = {
    [P in keyof T as T[P] extends Uint8Array ? `${string & P}Str` : never]: string
}
type Stringify2<T extends Message<T>> = {
    [P in keyof T as T[P] extends Uint8Array[] ? `${string & P}Strs` : never]: string[]
}
type Stringify3<T extends Message<T>> = {
    [P in keyof T]: StringifyField<T[P]>
}
type StringifyField<F> = F extends Message<infer U>
    ? Stringify<U>
    : F extends OneofSelectedMessage<infer C, infer V>
    ? {
          case: C
          value: Stringify<V>
      }
    : F extends {
          [key: string | number]: Message<infer U>
      }
    ? {
          [key: string | number]: Stringify<U>
      }
    : F

export type Stringify<T extends Message<T>> = Stringify1<T> & Stringify2<T> & Stringify3<T>

// Adds xxxStr field to the message for each xxx field of type Uint8Array
// and xxxStrs field to the message for each xxx field of type Uint8Array[]
// It makes it easier to work with the message in the TS code, where strings can be used
// as keys for maps/sets and be directly compared.
export const stringify = <T extends Message<T>>(message: T): Stringify<T> => {
    const ret = message as any
    const type = message.getType()
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

    for (const field of type.fields.byNumber()) {
        let value: any // this will be our field value, whether it is member of a oneof or regular field
        const repeated = field.repeated
        const localName = field.localName

        if (field.oneof) {
            const oneof: any = (message as AnyMessage)[field.oneof.localName]
            if (oneof.case !== localName) {
                continue // field is not selected, skip
            }
            value = oneof.value
        } else {
            value = (message as AnyMessage)[localName]
        }

        if (field.kind === 'scalar' && field.T === ScalarType.BYTES) {
            if (repeated) {
                ret[`${localName}Strs`] = (value as Uint8Array[]).map((v) => bin_toBase64(v))
            } else {
                ret[`${localName}Str`] = bin_toBase64(value as Uint8Array)
            }
        } else if (field.kind === 'message') {
            if (repeated) {
                for (const item of value as AnyMessage[]) {
                    stringify(item)
                }
            } else {
                stringify(value as AnyMessage)
            }
        } else if (field.kind === 'map') {
            if (field.V.kind === 'scalar' && field.V.T === ScalarType.BYTES) {
                for (const [key, val] of Object.entries(value)) {
                    ret[`${localName}Strs`][key] = bin_toBase64(val as Uint8Array)
                }
            } else if (field.V.kind === 'message') {
                for (const [_key, val] of Object.entries(value)) {
                    stringify(val as AnyMessage)
                }
            }
        }
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
    return ret as Stringify<T>
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
