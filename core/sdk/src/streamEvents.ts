import {
    ChannelProperties,
    SnapshotCaseType,
    FullyReadMarker,
    UserInboxPayload_GroupEncryptionSessions,
} from '@river/proto'
import {
    ClientInitStatus,
    ConfirmedTimelineEvent,
    DecryptedTimelineEvent,
    KeySolicitationContent,
    LocalTimelineEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { UserDevice } from '@river/encryption'
import { EncryptedContent } from './encryptedContentTypes'

export type StreamChange = {
    prepended?: RemoteTimelineEvent[]
    appended?: StreamTimelineEvent[]
    updated?: StreamTimelineEvent[]
    confirmed?: ConfirmedTimelineEvent[]
}

/// Encryption events, emitted by streams, always emitted.
export type StreamEncryptionEvents = {
    newGroupSessions: (sessions: UserInboxPayload_GroupEncryptionSessions, senderId: string) => void
    newEncryptedContent: (streamId: string, eventId: string, content: EncryptedContent) => void
    newKeySolicitation: (
        streamId: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        event: KeySolicitationContent,
    ) => void
    updatedKeySolicitation: (
        streamId: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        event: KeySolicitationContent,
    ) => void
    userDeviceKeyMessage: (streamId: string, userId: string, userDevice: UserDevice) => void
}

/// Stream state events, emitted after initialization
export type StreamStateEvents = {
    clientInitStatusUpdated: (status: ClientInitStatus) => void
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
    streamMembershipUpdated: (streamId: string, userId: string) => void
    streamPendingMembershipUpdated: (streamId: string, userId: string) => void
    streamSyncActive: (active: boolean) => void
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    userStreamMembershipChanged: (streamId: string) => void
    spaceChannelCreated: (
        spaceId: string,
        channelId: string,
        channelProperties: ChannelProperties,
    ) => void
    spaceChannelUpdated: (
        spaceId: string,
        channelId: string,
        channelProperties: ChannelProperties,
    ) => void
    spaceChannelDeleted: (spaceId: string, channelId: string) => void
    fullyReadMarkersUpdated: (
        channelId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ) => void
    eventDecrypted: (
        streamId: string,
        contentKind: SnapshotCaseType,
        event: DecryptedTimelineEvent,
    ) => void
    streamInitialized: (streamId: string, contentKind: SnapshotCaseType) => void
    streamUpToDate: (streamId: string) => void
    streamUpdated: (streamId: string, contentKind: SnapshotCaseType, change: StreamChange) => void
    streamLocalEventUpdated: (
        streamId: string,
        contentKind: SnapshotCaseType,
        localEventId: string,
        event: LocalTimelineEvent,
    ) => void
    streamLatestTimestampUpdated: (streamId: string) => void
    streamUsernameUpdated: (streamId: string, userId: string) => void
    streamDisplayNameUpdated: (streamId: string, userId: string) => void
    streamPendingUsernameUpdated: (streamId: string, userId: string) => void
    streamPendingDisplayNameUpdated: (streamId: string, userId: string) => void
    streamChannelPropertiesUpdated: (streamId: string) => void
    streamRemovedFromSync: (streamId: string) => void
}

export type StreamEvents = StreamEncryptionEvents & StreamStateEvents
