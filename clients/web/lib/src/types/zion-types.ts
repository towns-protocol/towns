import { PlainMessage } from '@bufbuild/protobuf'
import { SpaceProtocol } from '../client/ZionClientTypes'
import { HistoryVisibility, IContent, MatrixEvent } from 'matrix-js-sdk'
import { RoomIdentifier } from './room-identifier'
import { StreamSettings } from '@river/proto'
import { Stream } from '@river/sdk'

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
    topic?: string
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
    isLoadingChannels: boolean
}

export interface SpaceHierarchies {
    [roomId: string]: SpaceHierarchy
}

export interface SpaceHierarchy {
    root: SpaceChild
    children: SpaceChild[]
}

export interface SpaceChild {
    id: RoomIdentifier
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
    topic?: string
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
    rawDisplayName?: string
    membership: Membership
    disambiguate?: boolean
    avatarUrl?: string
}

export interface UserIdToMember {
    [userId: string]: RoomMember | undefined
}

export interface CreateSpaceInfo {
    name: string
    visibility: RoomVisibility
    spaceMetadata?: string
    spaceProtocol?: SpaceProtocol
    disableEncryption?: boolean
    defaultChannelName?: string
}

export interface CreateChannelInfo {
    name: string
    visibility: RoomVisibility
    parentSpaceId: RoomIdentifier
    historyVisibility?: HistoryVisibility
    roleIds: number[]
    disableEncryption?: boolean
    topic?: string
    streamSettings?: PlainMessage<StreamSettings>
}

export interface UpdateChannelInfo {
    parentSpaceId: RoomIdentifier
    channelId: RoomIdentifier
    updatedChannelName?: string
    updatedRoleIds?: number[]
    updatedChannelTopic?: string
}

export enum MessageType {
    Text = 'm.text',
    GM = 'm.gm',
    Image = 'm.Image',
}

export interface ThreadIdOptions {
    threadId?: string
    threadPreview?: string
    threadParticipants?: Set<string>
}

export type SendTextMessageOptions = ThreadIdOptions & {
    messageType?: MessageType.Text
    mentions?: Mention[]
}

export interface Mention {
    displayName: string
    userId: string
}

export type SendGMOptions = ThreadIdOptions & {
    messageType: MessageType.GM
}

// ImageInfo from matrix-js-sdk (node_modules/matrix-js-sdk/src/@types/partials.ts) is incomplete against matrix spec (https://spec.matrix.org/v1.3/client-server-api/#mimage)
// and missing key `url` props so rolling our own
// note aellis 04/2023 we updated the format
// tests in app/timelineItem.test.tsx ensure that we can render both types
export type SendImageMessageOptions = ThreadIdOptions & {
    messageType: MessageType.Image
    info: {
        url: string
        size?: number
        mimetype: string
        w?: number
        h?: number
    }
    thumbnail?: {
        url: string
        size?: number
        mimetype: string
        w?: number
        h?: number
    }
}

export interface SendZionReactionOptions {
    targetEventId: string
}

export interface SpaceIdOptions {
    parentSpaceId?: RoomIdentifier
}

export type SendMessageOptionsBase =
    | SendTextMessageOptions
    | SendGMOptions
    | SendImageMessageOptions

export type SendMessageOptions = SendMessageOptionsBase & SpaceIdOptions

export type ImageMessageContent = IContent & Omit<SendImageMessageOptions, 'messageType'>

export type MessageContent = IContent | ImageMessageContent

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

export function getIdForMatrixEvent(event: MatrixEvent): string {
    const eventId = event.getId()
    if (eventId) {
        return eventId
    }
    console.warn('getIdForMatrixEvent: event has no id', {
        type: event.getType(),
        content: event.getContent(),
    })
    // this should never??? happen, but if it does, we need to generate a unique id
    // for things to run, so we'll use the local timestamp and a random number
    return `UnknownId_${event.localTimestamp}_${Math.floor(Math.random() * 4095).toString(16)}`
}

export function isMentionedTextMessageOptions(
    options: SendMessageOptions,
): options is SendTextMessageOptions {
    return 'mentions' in options && Array.isArray(options.mentions) && options.mentions.length > 0
}

export function isThreadIdOptions(options: SendMessageOptions): options is ThreadIdOptions {
    return 'threadId' in options && typeof options.threadId === 'string'
}

export function getMembershipFor(userId: string, stream: Stream): Membership {
    if (stream.view.getMemberships().joinedUsers.has(userId)) {
        return Membership.Join
    }
    if (stream.view.getMemberships().invitedUsers.has(userId)) {
        return Membership.Invite
    }
    return Membership.None
}
