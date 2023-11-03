import {
    DeviceKeys,
    ChannelProperties,
    SnapshotCaseType,
    FullyReadMarker,
    UserPayload_ToDevice,
    KeySolicitation,
} from '@river/proto'
import { ParsedEvent } from './types'
import { RiverEventV2 } from './eventV2'
export type StreamEvents = {
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
    streamMembershipUpdated: (streamId: string, userId: string) => void
    streamPendingMembershipUpdated: (streamId: string, userId: string) => void
    streamMyMembershipUpdated: (
        streamId: string,
        membership: { joined: boolean; invited: boolean },
    ) => void
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
    channelNewMessage: (channelId: string, message: RiverEventV2) => void
    channelTimelineEvent: (channelId: string, spaceId: string, event: ParsedEvent) => void
    fullyReadMarkersUpdated: (
        channelId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ) => void
    toDeviceMessage: (streamId: string, event: UserPayload_ToDevice, senderUserId: string) => void
    keySolicitationMessage: (
        streamId: string,
        event: KeySolicitation,
        eventHash: string,
        senderUserId: string,
    ) => void
    userDeviceKeyMessage: (
        streamId: string,
        userId: string,
        deviceKeys: DeviceKeys,
        fallbackKeys: object | undefined,
    ) => void
    streamInitialized: (streamId: string, contentKind: SnapshotCaseType) => void
    streamUpdated: (streamId: string, contentKind: SnapshotCaseType, events: ParsedEvent[]) => void
    streamEventsPrepended: (
        streamId: string,
        contentKind: SnapshotCaseType,
        events: ParsedEvent[],
    ) => void
    streamUsernameUpdated: (streamId: string, userId: string) => void
    streamDisplayNameUpdated: (streamId: string, userId: string) => void
    streamPendingUsernameUpdated: (streamId: string, userId: string) => void
    streamPendingDisplayNameUpdated: (streamId: string, userId: string) => void
}

export type StreamEventKeys = keyof StreamEvents
