import {
    SnapshotCaseType,
    FullyReadMarker,
    UserInboxPayload_GroupEncryptionSessions,
    UserSettingsPayload_UserBlock,
    UserPayload_UserMembership,
    UserInboxPayload_Snapshot_DeviceSummary,
    BlockchainTransaction_Tip,
} from '@towns-protocol/proto'

import {
    ClientInitStatus,
    ConfirmedTimelineEvent,
    LocalTimelineEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { UserDevice } from '@towns-protocol/encryption'
import {
    EventSignatureBundle,
    KeyFulfilmentData,
    KeySolicitationContent,
} from './decryptionExtensions'
import { EncryptedContent } from './encryptedContentTypes'
import { SyncState } from './syncedStreamsLoop'
import { Pin } from './streamStateView_Members'
import { SpaceReviewEventObject } from '@towns-protocol/web3'
import { TimelineEvent } from './views/models/timelineTypes'

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
        eventHashStr: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        event: KeySolicitationContent,
        sigBundle: EventSignatureBundle,
        ephemeral?: boolean,
    ) => void
    updatedKeySolicitation: (
        streamId: string,
        eventHashStr: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        event: KeySolicitationContent,
        sigBundle: EventSignatureBundle,
    ) => void
    initKeySolicitations: (
        streamId: string,
        eventHashStr: string,
        members: {
            userId: string
            userAddress: Uint8Array
            solicitations: KeySolicitationContent[]
        }[],
        sigBundle: EventSignatureBundle,
    ) => void
    userDeviceKeyMessage: (streamId: string, userId: string, userDevice: UserDevice) => void
    ephemeralKeyFulfillment: (event: KeyFulfilmentData) => void
}

export type SyncedStreamEvents = {
    streamSyncStateChange: (newState: SyncState) => void
    streamRemovedFromSync: (streamId: string) => void
    streamSyncActive: (active: boolean) => void
    streamSyncBatchCompleted: (details: { duration: number; count: number }) => void
    streamSyncTimedOut: (details: { duration: number }) => void
}

/// Stream state events, emitted after initialization
export type StreamStateEvents = {
    clientInitStatusUpdated: (status: ClientInitStatus) => void
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
    streamMembershipUpdated: (streamId: string, userId: string) => void
    streamPendingMembershipUpdated: (streamId: string, userId: string) => void
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    userStreamMembershipChanged: (streamId: string, payload: UserPayload_UserMembership) => void
    userProfileImageUpdated: (streamId: string) => void
    userBioUpdated: (streamId: string) => void
    userInboxDeviceSummaryUpdated: (
        streamId: string,
        deviceKey: string,
        summary: UserInboxPayload_Snapshot_DeviceSummary,
    ) => void
    userDeviceKeysUpdated: (streamId: string, deviceKeys: UserDevice[]) => void
    userTipSent: (streamId: string, currency: string, amount: bigint) => void
    userTipReceived: (streamId: string, currency: string, amount: bigint) => void
    streamTipped: (
        streamId: string,
        eventId: string,
        transaction: BlockchainTransaction_Tip,
    ) => void
    spaceChannelCreated: (spaceId: string, channelId: string) => void
    spaceChannelUpdated: (spaceId: string, channelId: string, updatedAtEventNum: bigint) => void
    spaceChannelAutojoinUpdated: (spaceId: string, channelId: string, autojoin: boolean) => void
    spaceChannelHideUserJoinLeaveEventsUpdated: (
        spaceId: string,
        channelId: string,
        hideUserJoinLeaveEvents: boolean,
    ) => void
    spaceChannelDeleted: (spaceId: string, channelId: string) => void
    spaceImageUpdated: (spaceId: string) => void
    spaceReviewsUpdated: (streamId: string, review: SpaceReviewEventObject) => void
    channelPinAdded: (channelId: string, pin: Pin) => void
    channelPinRemoved: (channelId: string, pin: Pin, index: number) => void
    channelPinDecrypted: (channelId: string, pin: Pin, index: number) => void
    fullyReadMarkersUpdated: (
        channelId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ) => void
    userBlockUpdated: (userBlock: UserSettingsPayload_UserBlock) => void
    eventDecrypted: (streamId: string, contentKind: SnapshotCaseType, event: TimelineEvent) => void
    streamInitialized: (streamId: string, contentKind: SnapshotCaseType) => void
    streamUpToDate: (streamId: string) => void
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
    streamEnsAddressUpdated: (streamId: string, userId: string) => void
    streamNftUpdated: (streamId: string, userId: string) => void
    streamChannelPropertiesUpdated: (streamId: string) => void
    streamEncryptionAlgorithmUpdated: (streamId: string, encryptionAlgorithm?: string) => void
    streamTokenTransfer: (
        streamId: string,
        transaction: {
            address: Uint8Array
            amount: bigint
            isBuy: boolean
            chainId: string
            userId: string
            createdAtEpochMs: bigint
            messageId: string
        },
    ) => void
}

export type StreamEvents = StreamEncryptionEvents & StreamStateEvents & SyncedStreamEvents
