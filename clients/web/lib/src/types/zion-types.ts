import { PlainMessage } from '@bufbuild/protobuf'
import { MembershipOp, StreamSettings } from '@river/proto'
import { Attachment } from './timeline-types'
import { staticAssertNever } from '../utils/zion-utils'

export enum Membership {
    Join = 'join',
    Invite = 'invite',
    Leave = 'leave',
    Ban = 'ban',
    Knock = 'knock',
    None = '',
}

export interface InviteData {
    id: string
    name: string
    avatarSrc: string
    isSpaceRoom: boolean
    spaceParentId?: string
}

export interface ChannelData {
    spaceId: string | undefined
    channelId: string
    channel?: Channel
}

export interface Channel {
    id: string
    label: string
    private?: boolean
    highlight?: boolean
    topic?: string
}

export interface ChannelGroup {
    label: string
    channels: Channel[]
}

/// data for top level list of spaces
export interface SpaceItem {
    id: string
    name: string
    avatarSrc: string
}

/// representation of a space for the UI with channels
export interface SpaceData {
    id: string
    name: string
    avatarSrc: string
    channelGroups: ChannelGroup[]
    membership: string
    isLoadingChannels: boolean
    hasLoadedMemberships: boolean
}

export interface SpaceHierarchies {
    [roomId: string]: SpaceHierarchy
}

export interface SpaceHierarchy {
    root: SpaceChild
    children: SpaceChild[]
}

export interface SpaceChild {
    id: string
    name: string
    avatarUrl?: string
    topic?: string
    canonicalAlias?: string
    aliases?: string[]
    worldReadable: boolean
    guestCanJoin: boolean
    numjoinedMembers: number
}

export interface Room {
    id: string
    name: string
    membership: string
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember }
    inviter?: string
    isSpaceRoom: boolean
    topic?: string
}

export interface Rooms {
    [slug: string]: Room
}

export interface RoomMember {
    userId: string
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    avatarUrl?: string
}

export interface UserIdToMember {
    [userId: string]: RoomMember | undefined
}

export interface CreateSpaceInfo {
    name: string
    spaceMetadata?: string
    defaultChannelName?: string
}

export interface CreateChannelInfo {
    name: string
    parentSpaceId: string
    roleIds: number[]
    topic?: string
    streamSettings?: PlainMessage<StreamSettings>
}

export interface UpdateChannelInfo {
    parentSpaceId: string
    channelId: string
    updatedChannelName?: string
    updatedRoleIds?: number[]
    updatedChannelTopic?: string
}

export enum MessageType {
    Text = 'm.text',
    GM = 'm.gm',
    Image = 'm.Image',
    EmbeddedMedia = 'm.embedded_media',
    ChunkedMedia = 'm.chunked_media',
}

export interface ThreadIdOptions {
    threadId?: string
    threadPreview?: string
    threadParticipants?: Set<string>
}

export type SendTextMessageOptions = ThreadIdOptions & {
    messageType?: MessageType.Text
    mentions?: Mention[]
    attachments?: Attachment[]
}

export interface Mention {
    displayName: string
    userId: string
}

export type SendGMOptions = ThreadIdOptions & {
    messageType: MessageType.GM
}

export type SendImageMessageOptions = ThreadIdOptions & {
    messageType: MessageType.Image
    info: {
        url: string
        size?: number
        mimetype: string
        width: number
        height: number
    }
    thumbnail?: {
        url: string
        size?: number
        mimetype: string
        width: number
        height: number
    }
}

export type SendEmbeddedMediaOptions = ThreadIdOptions & {
    messageType: MessageType.EmbeddedMedia
    content: Uint8Array
    info: {
        sizeBytes: bigint
        mimetype: string
        widthPixels: number
        heightPixels: number
    }
}

export type SendChunkedMediaMessageOptions = ThreadIdOptions & {
    messageType: MessageType.ChunkedMedia
    streamId: string
    iv: Uint8Array
    secretKey: Uint8Array
    info: {
        sizeBytes: bigint
        mimetype: string
        widthPixels: number
        heightPixels: number
        filename: string
    }
    thumbnail: {
        info: {
            sizeBytes: bigint
            mimetype: string
            widthPixels: number
            heightPixels: number
        }
        content: Uint8Array
    }
}

export interface SendZionReactionOptions {
    targetEventId: string
}

export interface SpaceIdOptions {
    parentSpaceId?: string
}

export type SendMessageOptionsBase =
    | SendTextMessageOptions
    | SendGMOptions
    | SendImageMessageOptions
    | SendEmbeddedMediaOptions
    | SendChunkedMediaMessageOptions

export type SendMessageOptions = SendMessageOptionsBase & SpaceIdOptions

export function isMentionedTextMessageOptions(
    options: SendMessageOptions,
): options is SendTextMessageOptions {
    return 'mentions' in options && Array.isArray(options.mentions) && options.mentions.length > 0
}

export function isThreadIdOptions(options: SendMessageOptions): options is ThreadIdOptions {
    return 'threadId' in options && typeof options.threadId === 'string'
}

export function toMembership(membershipOp?: MembershipOp): Membership {
    switch (membershipOp) {
        case MembershipOp.SO_JOIN:
            return Membership.Join
        case MembershipOp.SO_INVITE:
            return Membership.Invite
        case MembershipOp.SO_LEAVE:
            return Membership.Leave
        case MembershipOp.SO_UNSPECIFIED:
            return Membership.None
        case undefined:
            return Membership.None
        default:
            staticAssertNever(membershipOp)
            return Membership.None
    }
}
