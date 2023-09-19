import {
    DeviceKeys,
    ChannelProperties,
    FullyReadMarkerContent,
    SnapshotCaseType,
} from '@river/proto'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
export type StreamEvents = {
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
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
    channelNewMessage: (channelId: string, message: RiverEvent) => void
    channelTimelineEvent: (channelId: string, spaceId: string, event: ParsedEvent) => void
    channelUnreadMarkerUpdated: (fullyReadMarkers: Record<string, FullyReadMarkerContent>) => void
    toDeviceMessage: (streamId: string, event: RiverEvent) => void
    userDeviceKeyMessage: (
        streamId: string,
        userId: string,
        deviceKeys: DeviceKeys,
        fallbackKeys: object | undefined,
    ) => void
    streamInitialized: (
        streamId: string,
        contentKind: SnapshotCaseType,
        events: ParsedEvent[],
    ) => void
    streamUpdated: (streamId: string, contentKind: SnapshotCaseType, events: ParsedEvent[]) => void
    streamEventsPrepended: (
        streamId: string,
        contentKind: SnapshotCaseType,
        events: ParsedEvent[],
    ) => void
}

export type StreamEventKeys = keyof StreamEvents
