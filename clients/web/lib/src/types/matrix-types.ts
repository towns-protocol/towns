import { SpaceProtocol } from '../client/ZionClientTypes'
import { HistoryVisibility, IContent } from 'matrix-js-sdk'
import { MatrixRoomIdentifier, RoomIdentifier } from './room-identifier'

export enum RoomVisibility {
    Private = 'private',
    Public = 'public',
}

export enum Membership {
    Join = 'join',
    Invite = 'invite',
    Leave = 'leave',
    Ban = 'ban',
    Knock = 'knock',
    None = '',
}

export interface InviteData {
    id: RoomIdentifier
    name: string
    avatarSrc: string
    isSpaceRoom: boolean
    spaceParentId?: RoomIdentifier
}

export interface ChannelData {
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    channel?: Channel
}

export interface Channel {
    id: RoomIdentifier
    label: string
    private?: boolean
    highlight?: boolean
}

export interface ChannelGroup {
    label: string
    channels: Channel[]
}

/// data for top level list of spaces
export interface SpaceItem {
    id: RoomIdentifier
    name: string
    avatarSrc: string
}

/// representation of a space for the UI with channels
export interface SpaceData {
    id: RoomIdentifier
    name: string
    avatarSrc: string
    channelGroups: ChannelGroup[]
    membership: string
}

export interface SpaceHierarchies {
    [roomId: string]: SpaceHierarchy
}

export interface SpaceHierarchy {
    root: SpaceChild
    children: SpaceChild[]
}

export interface SpaceChild {
    id: MatrixRoomIdentifier
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
    id: RoomIdentifier
    name: string
    membership: string
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember }
    inviter?: string
    isSpaceRoom: boolean
}

export interface Rooms {
    [slug: string]: Room
}

export interface User {
    userId: string
    displayName: string
    avatarUrl?: string
    presence?: string
    lastPresenceTs: number
    currentlyActive: boolean
}

export interface RoomMember {
    userId: string
    name: string
    membership: Membership
    avatarUrl?: string
}

export interface CreateSpaceInfo {
    name: string
    visibility: RoomVisibility
    spaceMetadata?: string
    spaceProtocol?: SpaceProtocol
    disableEncryption?: boolean
}

export interface CreateChannelInfo {
    name: string
    visibility: RoomVisibility
    parentSpaceId: RoomIdentifier
    historyVisibility?: HistoryVisibility
    roleIds: number[]
    disableEncryption?: boolean
}

/// use to send different types of messages, e.g. text, emoji, image, etc.
/// currently unsupported: Emote = "m.emote", Notice = "m.notice", File = "m.file", Audio = "m.audio", Location = "m.location", Video = "m.video",
export enum MessageType {
    Text = 'm.text',
    WenMoon = 'm.wenmoon',
    Image = 'm.Image',
    ZionText = 'm.ZionText',
}

export interface SendTextMessageOptions {
    threadId?: string
    messageType?: MessageType.Text
    mentions?: Mention[]
}

export interface Mention {
    displayName: string
    userId?: string
}

interface SendWenMoonOptions {
    threadId?: string
    messageType: MessageType.WenMoon
}

// ImageInfo from matrix-js-sdk (node_modules/matrix-js-sdk/src/@types/partials.ts) is incomplete against matrix spec (https://spec.matrix.org/v1.3/client-server-api/#mimage)
// and missing key `url` props so rolling our own
interface SendImageMessageOptions {
    threadId?: string
    messageType: MessageType.Image
    url: string
    // file: EncryptedFile // TBD if this will be needed
    info?: {
        size?: number
        mimetype?: string
        // thumbnail_file: EncryptedFile
        thumbnail_url?: string
        thumbnail_info?: {
            w?: number
            h?: number
            size?: number
            mimetype?: string
        }
        w?: number
        h?: number
    }
}

interface SendZionTextMessageOptions {
    threadId?: string
    messageType: MessageType.ZionText
    attachments?: {
        url?: string
    }[]
}

export type SendMessageOptions =
    | SendTextMessageOptions
    | SendWenMoonOptions
    | SendImageMessageOptions
    | SendZionTextMessageOptions

export type ImageMessageContent = IContent & Omit<SendImageMessageOptions, 'messageType'>

export type ZionTextMessageContent = IContent & Omit<SendZionTextMessageOptions, 'messageType'>

export type MessageContent = IContent | ImageMessageContent | ZionTextMessageContent

export interface EditMessageOptions {
    originalEventId: string
}

export interface PowerLevels {
    userPowers: { [userId: string]: number }
    levels: PowerLevel[]
}

export interface PowerLevel {
    value: number
    definition: PowerLevelDefinition
}

export interface PowerLevelDefinition {
    key: string
    name: string
    description: string
    default: number
    parent?: string
}
