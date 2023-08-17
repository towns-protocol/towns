import { PlainMessage } from '@bufbuild/protobuf'
import {
    StreamEvent,
    Envelope,
    ChannelMessage,
    ChannelMessage_Post_Content_Text,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_UserDeviceKey,
    UserPayload_Inception,
    SpacePayload_Inception,
    ChannelProperties,
    ChannelPayload_Inception,
    UserSettingsPayload_Inception,
    Membership,
    UserPayload_ToDevice,
    SpacePayload_Channel,
    EncryptedData,
    ToDeviceMessage,
    ToDeviceOp,
    ToDeviceMessage_KeyRequest,
    ToDeviceMessage_KeyResponse,
    UserPayload_UserMembership,
    UserSettingsPayload_FullyReadMarkers,
    MiniblockHeader,
    ChannelMessage_Post_Mention,
    MegolmSession,
    KeyResponseKind,
    ChannelMessage_Post_Content_Image_Info,
    ChannelMessage_Post,
} from '@river/proto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { isDefined } from './check'
import { ISignatures } from './crypto/deviceInfo'
import { bin_toHexString } from './binary'
import { IMessage, IOlmEncryptedContent, OLM_ALGORITHM } from './crypto/olmLib'

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

export function isCiphertext(text: string): boolean {
    const cipherRegex = /^[A-Za-z0-9+/]{16,}$/
    // suffices to check prefix of chars for ciphertext
    // since obj.text when of the form EncryptedData is assumed to
    // be either plaintext or ciphertext not a base64 string or
    // something ciphertext-like.
    const maxPrefixCheck = 16
    return cipherRegex.test(text.slice(0, maxPrefixCheck))
}

export const takeKeccakFingerprintInHex = (buf: Uint8Array, n: number): string => {
    const hash = bin_toHexString(keccak256(buf))
    return hash.slice(0, n)
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

export const make_ChannelMessage_Post_Content_Text = (
    body: string,
    mentions?: PlainMessage<ChannelMessage_Post_Mention>[],
): PlainMessage<ChannelMessage>['payload'] => {
    const mentionsPayload = mentions !== undefined ? mentions : []
    return {
        case: 'post',
        value: {
            content: {
                case: 'text',
                value: {
                    body,
                    mentions: mentionsPayload,
                },
            },
        },
    }
}

export const make_ChannelMessage_Post_Content_Image = (
    title: string,
    info: PlainMessage<ChannelMessage_Post_Content_Image_Info>,
    thumbnail?: PlainMessage<ChannelMessage_Post_Content_Image_Info>,
): PlainMessage<ChannelMessage>['payload'] => {
    return {
        case: 'post',
        value: {
            content: {
                case: 'image',
                value: {
                    title,
                    info,
                    thumbnail,
                },
            },
        },
    }
}

export const make_ChannelMessage_Post_Content_GM = (
    typeUrl: string,
    value?: Uint8Array,
): PlainMessage<ChannelMessage>['payload'] => {
    return {
        case: 'post',
        value: {
            content: {
                case: 'gm',
                value: {
                    typeUrl,
                    value,
                },
            },
        },
    }
}

export const make_ChannelMessage_Reaction = (
    refEventId: string,
    reaction: string,
): PlainMessage<ChannelMessage>['payload'] => {
    return {
        case: 'reaction',
        value: {
            refEventId,
            reaction,
        },
    }
}

export const make_ChannelMessage_Edit = (
    refEventId: string,
    post: PlainMessage<ChannelMessage_Post>,
): PlainMessage<ChannelMessage>['payload'] => {
    return {
        case: 'edit',
        value: {
            refEventId,
            post,
        },
    }
}

export const make_ChannelMessage_Redaction = (
    refEventId: string,
    reason?: string,
): PlainMessage<ChannelMessage>['payload'] => {
    return {
        case: 'redaction',
        value: {
            refEventId,
            reason,
        },
    }
}

export const make_ToDevice_KeyRequest = (input: {
    spaceId: string
    channelId: string
    algorithm: string
    senderKey: string
    sessionId: string
    content?: string
    knownSessionIds?: string[]
}): PlainMessage<ToDeviceMessage>['payload'] => {
    const { knownSessionIds: possibleKnownSessionIds, ...rest } = input
    const knownSessionIds = possibleKnownSessionIds ? possibleKnownSessionIds : []
    return {
        case: 'request',
        value: { ...rest, knownSessionIds: knownSessionIds },
    }
}

export const make_ToDevice_KeyResponse = (input: {
    spaceId: string
    channelId: string
    sessions: PlainMessage<MegolmSession>[]
    kind: KeyResponseKind
    content?: string
}): PlainMessage<ToDeviceMessage>['payload'] => {
    return {
        case: 'response',
        value: { ...input },
    }
}

export const make_ChannelProperties = (
    channelName: string,
    channelTopic: string,
): ChannelProperties => {
    return new ChannelProperties({ name: channelName, topic: channelTopic })
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

export const make_UserSettingsPayload_FullyReadMarkers = (
    value: PlainMessage<UserSettingsPayload_FullyReadMarkers>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userSettingsPayload',
        value: {
            content: {
                case: 'fullyReadMarkers',
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
    value: PlainMessage<EncryptedData>,
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
): EncryptedData | undefined => {
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

export const getToDeviceWirePayloadContent = (
    payload: UserPayload_ToDevice,
): IOlmEncryptedContent => {
    let cipher: Record<string, IMessage> = {}
    if (payload.message !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        cipher = payload?.message.ciphertext
    }
    return {
        ciphertext: cipher,
        sender_key: payload.senderKey,
        algorithm: OLM_ALGORITHM,
    }
}

export const getToDevicePayloadContent = (
    payload: string,
    op: string,
): ToDeviceMessage_KeyRequest | ToDeviceMessage_KeyResponse | undefined => {
    let content: ToDeviceMessage_KeyRequest | ToDeviceMessage_KeyResponse | undefined = undefined
    switch (op) {
        case ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST]: {
            content = ToDeviceMessage_KeyRequest.fromJsonString(payload)
            return content
        }
        case ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE]: {
            content = ToDeviceMessage_KeyResponse.fromJsonString(payload)
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
    // todo: fix this
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const body = payload.message?.ciphertext?.body.toJsonString()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return ToDeviceMessage.fromJsonString(body as string)
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

export const getMiniblockHeader = (
    event: ParsedEvent | StreamEvent | undefined,
): MiniblockHeader | undefined => {
    if (!isDefined(event)) {
        return undefined
    }
    if ('event' in event) {
        event = event.event as unknown as StreamEvent
    }
    if (event.payload.case === 'miniblockHeader') {
        return event.payload.value
    }
    return undefined
}
