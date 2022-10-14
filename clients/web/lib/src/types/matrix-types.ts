import { HistoryVisibility } from 'matrix-js-sdk'

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

export interface RoomIdentifier {
    slug: string
    matrixRoomId: string
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
}

export interface CreateChannelInfo {
    name: string
    visibility: RoomVisibility
    parentSpaceId: RoomIdentifier
    historyVisibility?: HistoryVisibility
}

/// use to send different types of messages, e.g. text, emoji, image, etc.
/// currently unsupported: Emote = "m.emote", Notice = "m.notice", Image = "m.image", File = "m.file", Audio = "m.audio", Location = "m.location", Video = "m.video",
export enum MessageType {
    Text = 'm.text',
    WenMoon = 'm.wenmoon',
}

export interface SendMessageOptions {
    threadId?: string
    messageType?: MessageType
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoom(room: any): room is Room {
    const r = room as Room
    return (
        r.id != undefined &&
        r.id.matrixRoomId !== undefined &&
        r.name !== undefined &&
        r.members !== undefined &&
        r.membership !== undefined
    )
}

export function toRoomIdentifier(slugOrId: string | RoomIdentifier | undefined) {
    if (!slugOrId) {
        return undefined
    }
    if (typeof slugOrId === 'string') {
        return makeRoomIdentifierFromSlug(slugOrId)
    }
    return slugOrId
}

export function makeRoomIdentifier(roomId: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(roomId.replace('.com', '-c0m-')), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
        matrixRoomId: roomId,
    }
}

export function makeRoomIdentifierFromSlug(slug: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(decodeURIComponent(slug)), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
        matrixRoomId: decodeURIComponent(slug).replace('-c0m-', '.com'),
    }
}
