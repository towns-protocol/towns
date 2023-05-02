/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { AnyMessage, Message, PartialMessage, ScalarType, protoBase64 } from '@bufbuild/protobuf'
import {
    StreamEvent,
    Envelope,
    Payload_Inception,
    Payload,
    Payload_UserMembershipOp,
    Payload_JoinableStream,
    Payload_Channel,
    Payload_Message,
    Payload_ToDevice,
    ChannelMessage,
    ChannelMessage_Post_Content_Text,
} from '@towns/proto'
import {
    bytesToHex,
    bytesToUtf8,
    equalsBytes,
    hexToBytes,
    utf8ToBytes,
} from 'ethereum-cryptography/utils'
import { isDefined } from './check'

export interface ParsedEvent {
    event: Stringify<StreamEvent>
    envelope: Envelope
    hashStr: string
    creatorUserId: string
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

export const makeInceptionPayload = (
    value: PartialMessage<Payload_Inception>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'inception',
            value,
        },
    }
}

export const makeUserMembershipOpPayload = (
    value: PartialMessage<Payload_UserMembershipOp>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'userMembershipOp',
            value,
        },
    }
}

export const makeJoinableStreamPayload = (
    value: PartialMessage<Payload_JoinableStream>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'joinableStream',
            value,
        },
    }
}

export const makeToDeviceStreamPayload = (
    value: PartialMessage<Payload_ToDevice>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'toDevice',
            value,
        },
    }
}

export const makeChannelPayload = (
    value: PartialMessage<Payload_Channel>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'channel',
            value,
        },
    }
}
export const getChannelPayload = (
    event: ParsedEvent | StreamEvent | undefined,
): Payload_Channel | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.payload.case === 'channel') {
        return event.payload.payload.value
    }
    return undefined
}

export const makeMessagePayload = (
    value: PartialMessage<Payload_Message>,
): PartialMessage<Payload> => {
    return {
        payload: {
            case: 'message',
            value,
        },
    }
}
export const getMessagePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): Payload_Message | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.payload.case === 'message') {
        return event.payload.payload.value
    }
    return undefined
}

export const getToDeviceMessagePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): Payload_ToDevice | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload?.payload.case === 'toDevice') {
        return event.payload.payload.value
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
    return ret as Stringify<T>
}

export type StringifiedPayloadValueType = Stringify<Payload>['payload']['value']
