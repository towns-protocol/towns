import {
    ChannelProperties,
    SnapshotCaseType,
    FullyReadMarker,
    UserToDevicePayload_GroupEncryptionSessions,
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
    newGroupSessions: (
        sessions: UserToDevicePayload_GroupEncryptionSessions,
        senderId: string,
    ) => void
    newEncryptedContent: (streamId: string, eventId: string, content: EncryptedContent) => void
    newKeySolicitation: (
        streamId: string,
        fromUserId: string,
        event: KeySolicitationContent,
    ) => void
    updatedKeySolicitation: (
        streamId: string,
        fromUserId: string,
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
    streamMyMembershipUpdated: (
        streamId: string,
        membership: { joined: boolean; invited: boolean },
    ) => void
    streamSyncActive: (active: boolean) => void
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
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
    streamUpdated: (streamId: string, contentKind: SnapshotCaseType, change: StreamChange) => void
    streamLocalEventIdReplaced: (
        streamId: string,
        contentKind: SnapshotCaseType,
        localEventId: string,
        event: LocalTimelineEvent,
    ) => void
    streamUsernameUpdated: (streamId: string, userId: string) => void
    streamDisplayNameUpdated: (streamId: string, userId: string) => void
    streamPendingUsernameUpdated: (streamId: string, userId: string) => void
    streamPendingDisplayNameUpdated: (streamId: string, userId: string) => void
    streamChannelPropertiesUpdated: (streamId: string) => void
    streamRemovedFromSync: (streamId: string) => void
}

export type StreamEvents = StreamEncryptionEvents & StreamStateEvents
