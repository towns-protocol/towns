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
    UserPayload_UserMembership,
    UserSettingsPayload_FullyReadMarkers,
    MiniblockHeader,
    ChannelMessage_Post_Mention,
    MegolmSession,
    KeyResponseKind,
    ChannelMessage_Post_Content_Image_Info,
    ChannelMessage_Post,
    MediaPayload_Inception,
    MediaPayload_Chunk,
    DmChannelPayload_Inception,
    GdmChannelPayload_Inception,
    KeySolicitation,
    Fulfillment,
} from '@river/proto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { isDefined } from './check'
import { ISignatures } from './crypto/deviceInfo'
import { bin_toHexString } from './binary'

export interface ParsedEvent {
    event: StreamEvent
    envelope: Envelope
    eventNum: bigint
    hashStr: string
    prevEventsStrs: string[]
    creatorUserId: string
}

export interface ParsedMiniblock {
    header: MiniblockHeader
    events: ParsedEvent[]
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
): ChannelMessage => {
    const mentionsPayload = mentions !== undefined ? mentions : []
    return new ChannelMessage({
        payload: {
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
        },
    })
}

export const make_ChannelMessage_Post_Content_Image = (
    title: string,
    info: PlainMessage<ChannelMessage_Post_Content_Image_Info>,
    thumbnail?: PlainMessage<ChannelMessage_Post_Content_Image_Info>,
): ChannelMessage => {
    return new ChannelMessage({
        payload: {
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
        },
    })
}

export const make_ChannelMessage_Post_Content_GM = (
    typeUrl: string,
    value?: Uint8Array,
): ChannelMessage => {
    return new ChannelMessage({
        payload: {
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
        },
    })
}

export const make_ChannelMessage_Reaction = (
    refEventId: string,
    reaction: string,
): ChannelMessage => {
    return new ChannelMessage({
        payload: {
            case: 'reaction',
            value: {
                refEventId,
                reaction,
            },
        },
    })
}

export const make_ChannelMessage_Edit = (
    refEventId: string,
    post: PlainMessage<ChannelMessage_Post>,
): ChannelMessage => {
    return new ChannelMessage({
        payload: {
            case: 'edit',
            value: {
                refEventId,
                post,
            },
        },
    })
}

export const make_ChannelMessage_Redaction = (
    refEventId: string,
    reason?: string,
): ChannelMessage => {
    return new ChannelMessage({
        payload: {
            case: 'redaction',
            value: {
                refEventId,
                reason,
            },
        },
    })
}

export const make_ToDevice_KeyRequest = (input: {
    streamId: string
    algorithm: string
    senderKey: string
    sessionId: string
    content?: string
    knownSessionIds?: string[]
}): PlainMessage<ToDeviceMessage> => {
    const { knownSessionIds: possibleKnownSessionIds, ...rest } = input
    const knownSessionIds = possibleKnownSessionIds ? possibleKnownSessionIds : []
    return {
        payload: {
            case: 'request',
            value: { ...rest, knownSessionIds: knownSessionIds },
        },
    }
}

export const make_ToDevice_KeyResponse = (input: {
    streamId: string
    sessions: PlainMessage<MegolmSession>[]
    kind: KeyResponseKind
    content?: string
}): PlainMessage<ToDeviceMessage> => {
    return {
        payload: {
            case: 'response',
            value: { ...input },
        },
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

export const make_DMChannelPayload_Inception = (
    value: PlainMessage<DmChannelPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'dmChannelPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_DMChannelPayload_Membership = (
    value: PlainMessage<Membership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'dmChannelPayload',
        value: {
            content: {
                case: 'membership',
                value,
            },
        },
    }
}

export const make_GDMChannelPayload_Inception = (
    value: PlainMessage<GdmChannelPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_GDMChannelPayload_Membership = (
    value: PlainMessage<Membership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
        value: {
            content: {
                case: 'membership',
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

export const make_ChannelPayload_KeySolicitation = (
    value: PlainMessage<KeySolicitation>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'keySolicitation',
                value,
            },
        },
    }
}

export const make_DmChannelPayload_KeySolicitation = (
    value: PlainMessage<KeySolicitation>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'dmChannelPayload',
        value: {
            content: {
                case: 'keySolicitation',
                value,
            },
        },
    }
}

export const make_GdmChannelPayload_KeySolicitation = (
    value: PlainMessage<KeySolicitation>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
        value: {
            content: {
                case: 'keySolicitation',
                value,
            },
        },
    }
}

export const make_ChannelPayload_Fulfillment = (
    value: PlainMessage<Fulfillment>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'fulfillment',
                value,
            },
        },
    }
}

export const make_DmChannelPayload_Fulfillment = (
    value: PlainMessage<Fulfillment>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'dmChannelPayload',
        value: {
            content: {
                case: 'fulfillment',
                value,
            },
        },
    }
}

export const make_GdmChannelPayload_Fulfillment = (
    value: PlainMessage<Fulfillment>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
        value: {
            content: {
                case: 'fulfillment',
                value,
            },
        },
    }
}

export const make_DMChannelPayload_Message = (
    value: PlainMessage<EncryptedData>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'dmChannelPayload',
        value: {
            content: {
                case: 'message',
                value,
            },
        },
    }
}

export const make_GDMChannelPayload_Message = (
    value: PlainMessage<EncryptedData>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
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

export const make_MediaPayload_Inception = (
    value: PlainMessage<MediaPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'mediaPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_MediaPayload_Chunk = (
    value: PlainMessage<MediaPayload_Chunk>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'mediaPayload',
        value: {
            content: {
                case: 'chunk',
                value,
            },
        },
    }
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
