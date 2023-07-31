import {
    DeviceKeys,
    ChannelPayload_Inception,
    StreamEvent,
    SpacePayload_Inception,
    UserDeviceKeyPayload_Inception,
    UserSettingsPayload_Inception,
    UserPayload_Inception,
    PayloadCaseType,
    ChannelProperties,
    FullyReadMarkerContent,
} from '@towns/proto'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
export type StreamEvents = {
    streamInception: (streamId: string, event: StreamEvent) => void
    spaceInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: SpacePayload_Inception,
    ) => void
    channelInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: ChannelPayload_Inception,
    ) => void
    userInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserPayload_Inception,
    ) => void
    userSettingsInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserSettingsPayload_Inception,
    ) => void
    userDeviceKeyInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserDeviceKeyPayload_Inception,
    ) => void
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
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
        payloadKind: PayloadCaseType,
        events: ParsedEvent[],
    ) => void
    streamUpdated: (streamId: string, payloadKind: PayloadCaseType, events: ParsedEvent[]) => void
}

export type StreamEventKeys = keyof StreamEvents
