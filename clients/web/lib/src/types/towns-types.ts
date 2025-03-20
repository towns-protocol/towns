import { SpacePayload_ChannelSettings, StreamSettings, PlainMessage } from '@towns-protocol/proto'
import { Permission } from '@towns-protocol/web3'
import { TSigner } from './web3-types'
import { MessageType, Attachment, Membership, Nft } from '@towns-protocol/sdk'

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
    isAutojoin: boolean
    isDefault: boolean
    hideUserJoinLeaveEvents: boolean
    disabled: boolean
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
    [streamId: string]: SpaceHierarchy
}

export interface SpaceHierarchy {
    channels: SpaceChild[]
}

export interface SpaceChild {
    id: string
}

export interface StreamView {
    // aellis, it is possible for membership and members to get out of sync
    // with the actual membership of the stream.  This is because the membership
    // is updated in the userStream, and the members are updated in the stream
    // itself. In this case the client should either retry the join or leave request
    // to get back into a good state.
    id: string
    // the current user's membership, tracted in the userStream
    membership: Membership
    // the members of the stream
    members: TownsStreamMember[]
}

export interface Room {
    id: string
    membership: string
    members: string[]
}

export interface Rooms {
    [slug: string]: Room
}

export interface TownsStreamMember {
    userId: string
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    avatarUrl?: string
    ensAddress?: string
    nft?: Nft
    ensName?: string
}

export interface UserIdToMember {
    [userId: string]: TownsStreamMember | undefined
}

export interface CreateSpaceInfo {
    name: string
    uri?: string
    defaultChannelName?: string
    shortDescription?: string
    longDescription?: string
    // TODO: prepaySupply doesn't belong in the this structure, but so doesn't the
    // other properties. Moving this out would require the refactor of the
    // createSpaceTransaction signature which affects a lot of code and is out
    // of scope for this PR.
    prepaySupply?: number
}

export interface CreateChannelInfo {
    name: string
    parentSpaceId: string
    roles: { roleId: number; permissions: Permission[] }[]
    topic?: string
    streamSettings?: PlainMessage<StreamSettings>
    channelSettings?: PlainMessage<SpacePayload_ChannelSettings>
}

type UpdateChannelMetadataInfo = {
    parentSpaceId: string
    channelId: string
    updatedChannelName?: string
    updatedRoleIds?: number[]
    updatedChannelTopic?: string
    disabled?: boolean
}

type UpdateChannelAccessInfo = {
    parentSpaceId: string
    channelId: string
    disabled: boolean
}

export type UpdateChannelInfo = UpdateChannelMetadataInfo | UpdateChannelAccessInfo

export function isUpdateChannelAccessInfo(
    info: UpdateChannelInfo,
): info is UpdateChannelAccessInfo {
    return 'disabled' in info && !('updatedChannelName' in info || 'updatedRoleIds' in info)
}

export interface ThreadIdOptions {
    threadId?: string
    threadPreview?: string
    replyId?: string
    replyPreview?: string
    threadParticipants?: Set<string>
}

interface SendHooksOptions {
    onLocalEventAppended?: (localId: string) => void
    beforeSendEventHook?: Promise<void>
}

type SendMessageOptionsBase = SendHooksOptions & SpaceIdOptions & ThreadIdOptions

export type SendTextMessageOptions = SendMessageOptionsBase & {
    messageType?: MessageType.Text
    mentions?: Mention[]
    attachments?: Attachment[]
    emptyMessage?: true
}

export interface Mention {
    displayName: string
    userId: string
    atChannel?: boolean
}

export type SendGMOptions = SendMessageOptionsBase & {
    messageType: MessageType.GM
}

export type SendImageMessageOptions = SendMessageOptionsBase & {
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

export interface SpaceIdOptions {
    parentSpaceId?: string
}

export type TipParams = {
    spaceId: string
    receiverUserId: string
    receiverTokenId: string
    receiverUsername: string
    receiverAddress: string
    currency: string
    amount: bigint
    messageId: string
    channelId: string
    senderAddress: string
    signer: TSigner
}

export type CheckInParams = {
    signer: TSigner
}

export type SendMessageOptions = SendTextMessageOptions | SendGMOptions | SendImageMessageOptions

export function isMentionedTextMessageOptions(
    options: SendMessageOptions,
): options is SendTextMessageOptions {
    return 'mentions' in options && Array.isArray(options.mentions) && options.mentions.length > 0
}

export function isThreadIdOptions(options: SendMessageOptions): options is ThreadIdOptions {
    return 'threadId' in options && typeof options.threadId === 'string'
}
