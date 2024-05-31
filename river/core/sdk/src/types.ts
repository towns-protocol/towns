import { PlainMessage } from '@bufbuild/protobuf'
import {
    StreamEvent,
    ChannelMessage,
    ChannelMessage_Post_Content_Text,
    UserDeviceKeyPayload_Inception,
    UserPayload_Inception,
    SpacePayload_Inception,
    ChannelProperties,
    ChannelPayload_Inception,
    UserSettingsPayload_Inception,
    SpacePayload_ChannelUpdate,
    EncryptedData,
    UserPayload_UserMembership,
    UserSettingsPayload_UserBlock,
    UserSettingsPayload_FullyReadMarkers,
    MiniblockHeader,
    ChannelMessage_Post_Mention,
    ChannelMessage_Post,
    MediaPayload_Inception,
    MediaPayload_Chunk,
    DmChannelPayload_Inception,
    GdmChannelPayload_Inception,
    UserInboxPayload_Ack,
    UserInboxPayload_Inception,
    UserDeviceKeyPayload_EncryptionDevice,
    UserInboxPayload_GroupEncryptionSessions,
    SyncCookie,
    Snapshot,
    UserPayload_UserMembershipAction,
    MemberPayload_Membership,
    MembershipOp,
    MemberPayload_KeyFulfillment,
    MemberPayload_KeySolicitation,
    MemberPayload,
    MemberPayload_Nft,
} from '@river-build/proto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { bin_toHexString } from '@river-build/dlog'
import { isDefined } from './check'
import { DecryptedContent } from './encryptedContentTypes'
import { addressFromUserId, streamIdAsBytes } from './id'
import { DecryptionSessionError } from '@river-build/encryption'

export type LocalEventStatus = 'sending' | 'sent' | 'failed'
export interface LocalEvent {
    localId: string
    channelMessage: ChannelMessage
    status: LocalEventStatus
}

export interface ParsedEvent {
    event: StreamEvent
    hash: Uint8Array
    hashStr: string
    prevMiniblockHashStr?: string
    creatorUserId: string
}

export interface StreamTimelineEvent {
    hashStr: string
    creatorUserId: string
    eventNum: bigint
    createdAtEpochMs: bigint
    localEvent?: LocalEvent
    remoteEvent?: ParsedEvent
    decryptedContent?: DecryptedContent
    decryptedContentError?: DecryptionSessionError
    miniblockNum?: bigint
    confirmedEventNum?: bigint
}

export type RemoteTimelineEvent = Omit<StreamTimelineEvent, 'remoteEvent'> & {
    remoteEvent: ParsedEvent
}

export type LocalTimelineEvent = Omit<StreamTimelineEvent, 'localEvent'> & {
    localEvent: LocalEvent
}

export type ConfirmedTimelineEvent = Omit<
    StreamTimelineEvent,
    'remoteEvent' | 'confirmedEventNum' | 'miniblockNum'
> & {
    remoteEvent: ParsedEvent
    confirmedEventNum: bigint
    miniblockNum: bigint
}

export type DecryptedTimelineEvent = Omit<
    StreamTimelineEvent,
    'decryptedContent' | 'remoteEvent'
> & {
    remoteEvent: ParsedEvent
    decryptedContent: DecryptedContent
}

export function isLocalEvent(event: StreamTimelineEvent): event is LocalTimelineEvent {
    return event.localEvent !== undefined
}

export function isRemoteEvent(event: StreamTimelineEvent): event is RemoteTimelineEvent {
    return event.remoteEvent !== undefined
}

export function isDecryptedEvent(event: StreamTimelineEvent): event is DecryptedTimelineEvent {
    return event.decryptedContent !== undefined && event.remoteEvent !== undefined
}

export function isConfirmedEvent(event: StreamTimelineEvent): event is ConfirmedTimelineEvent {
    return (
        isRemoteEvent(event) &&
        event.confirmedEventNum !== undefined &&
        event.miniblockNum !== undefined
    )
}

export function makeRemoteTimelineEvent(params: {
    parsedEvent: ParsedEvent
    eventNum: bigint
    miniblockNum?: bigint
    confirmedEventNum?: bigint
}): RemoteTimelineEvent {
    return {
        hashStr: params.parsedEvent.hashStr,
        creatorUserId: params.parsedEvent.creatorUserId,
        eventNum: params.eventNum,
        createdAtEpochMs: params.parsedEvent.event.createdAtEpochMs,
        remoteEvent: params.parsedEvent,
        miniblockNum: params.miniblockNum,
        confirmedEventNum: params.confirmedEventNum,
    }
}

export interface ParsedMiniblock {
    hash: Uint8Array
    header: MiniblockHeader
    events: ParsedEvent[]
}

export interface ParsedStreamAndCookie {
    nextSyncCookie: SyncCookie
    miniblocks: ParsedMiniblock[]
    events: ParsedEvent[]
}

export interface ParsedStreamResponse {
    snapshot: Snapshot
    streamAndCookie: ParsedStreamAndCookie
    prevSnapshotMiniblockNum: bigint
    eventIds: string[]
}

export type ClientInitStatus = {
    isLocalDataLoaded: boolean
    isRemoteDataLoaded: boolean
    progress: number
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

export const make_MemberPayload_Membership = (
    value: PlainMessage<MemberPayload_Membership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'membership',
                value,
            },
        },
    }
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
export const make_UserPayload_UserMembership = (
    value: PlainMessage<UserPayload_UserMembership>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userPayload',
        value: {
            content: {
                case: 'userMembership',
                value,
            },
        },
    }
}

export const make_UserPayload_UserMembershipAction = (
    value: PlainMessage<UserPayload_UserMembershipAction>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userPayload',
        value: {
            content: {
                case: 'userMembershipAction',
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

export const make_MemberPayload_DisplayName = (
    value: PlainMessage<EncryptedData>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'displayName',
                value: value,
            },
        },
    }
}
export const make_MemberPayload_Username = (
    value: PlainMessage<EncryptedData>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'username',
                value: value,
            },
        },
    }
}

export const make_MemberPayload_EnsAddress = (
    value: Uint8Array,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'ensAddress',
                value: value,
            },
        },
    }
}

export const make_MemberPayload_Nft = (
    value: MemberPayload_Nft,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'nft',
                value: value,
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

type DeprecatedMembership = {
    userId: string
    op: MembershipOp
    initiatorId: string
    streamParentId?: string
}

export const make_MemberPayload_Membership2 = (
    value: DeprecatedMembership,
): PlainMessage<StreamEvent>['payload'] => {
    return make_MemberPayload_Membership({
        userAddress: addressFromUserId(value.userId),
        op: value.op,
        initiatorAddress: addressFromUserId(value.initiatorId),
        streamParentId: value.streamParentId ? streamIdAsBytes(value.streamParentId) : undefined,
    })
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

export const make_GDMChannelPayload_ChannelProperties = (
    value: PlainMessage<EncryptedData>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'gdmChannelPayload',
        value: {
            content: {
                case: 'channelProperties',
                value: value,
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

export const make_UserSettingsPayload_UserBlock = (
    value: PlainMessage<UserSettingsPayload_UserBlock>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userSettingsPayload',
        value: {
            content: {
                case: 'userBlock',
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

export const make_UserInboxPayload_Inception = (
    value: PlainMessage<UserInboxPayload_Inception>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userInboxPayload',
        value: {
            content: {
                case: 'inception',
                value,
            },
        },
    }
}

export const make_UserInboxPayload_GroupEncryptionSessions = (
    value: PlainMessage<UserInboxPayload_GroupEncryptionSessions>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userInboxPayload',
        value: {
            content: {
                case: 'groupEncryptionSessions',
                value,
            },
        },
    }
}

export const make_UserInboxPayload_Ack = (
    value: PlainMessage<UserInboxPayload_Ack>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userInboxPayload',
        value: {
            content: {
                case: 'ack',
                value,
            },
        },
    }
}

export const make_UserDeviceKeyPayload_EncryptionDevice = (
    value: PlainMessage<UserDeviceKeyPayload_EncryptionDevice>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'userDeviceKeyPayload',
        value: {
            content: {
                case: 'encryptionDevice',
                value,
            },
        },
    }
}

export const make_SpacePayload_ChannelUpdate = (
    value: PlainMessage<SpacePayload_ChannelUpdate>,
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

export const getChannelUpdatePayload = (
    event: ParsedEvent | StreamEvent | undefined,
): SpacePayload_ChannelUpdate | undefined => {
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

export const make_ChannelPayload_Redaction = (
    eventId: Uint8Array,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'channelPayload',
        value: {
            content: {
                case: 'redaction',
                value: {
                    eventId,
                },
            },
        },
    }
}

export const make_MemberPayload_KeyFulfillment = (
    value: PlainMessage<MemberPayload_KeyFulfillment>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'keyFulfillment',
                value,
            },
        } satisfies PlainMessage<MemberPayload>,
    }
}

export const make_MemberPayload_KeySolicitation = (
    content: PlainMessage<MemberPayload_KeySolicitation>,
): PlainMessage<StreamEvent>['payload'] => {
    return {
        case: 'memberPayload',
        value: {
            content: {
                case: 'keySolicitation',
                value: content,
            },
        } satisfies PlainMessage<MemberPayload>,
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
    return ChannelMessage.fromJsonString(payload.ciphertext)
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

export const getRefEventIdFromChannelMessage = (message: ChannelMessage): string | undefined => {
    switch (message.payload.case) {
        case 'edit':
        case 'reaction':
        case 'redaction':
            return message.payload.value.refEventId
        case 'post':
            return message.payload.value.threadId
        default:
            return undefined
    }
}
