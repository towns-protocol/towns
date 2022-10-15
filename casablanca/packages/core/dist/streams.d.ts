import TypedEmitter from 'typed-emitter';
import { FullEvent, StreamKind } from './types';
export declare const findLeafEventHashes: (streamId: string, events: FullEvent[]) => string[];
export declare type StreamEvents = {
    streamInception: (streamId: string, streamKind: StreamKind) => void;
    streamNewUserJoined: (streamId: string, userId: string) => void;
    streamNewUserInvited: (streamId: string, userId: string) => void;
    streamUserLeft: (streamId: string, userId: string) => void;
    userJoinedStream: (streamId: string) => void;
    userInvitedToStream: (streamId: string) => void;
    userLeftStream: (streamId: string) => void;
    spaceNewChannelCreated: (spaceId: string, channelId: string) => void;
    spaceChannelDeleted: (spaceId: string, channelId: string) => void;
    channelNewMessage: (channelId: string, message: FullEvent) => void;
    streamInitialized: (streamId: string, streamKind: StreamKind, events: FullEvent[]) => void;
    streamUpdated: (streamId: string, events: FullEvent[]) => void;
};
export declare class StreamStateView {
    readonly streamId: string;
    readonly streamKind: StreamKind;
    readonly events: Map<string, FullEvent>;
    readonly joinedUsers: Set<string>;
    readonly invitedUsers: Set<string>;
    readonly messages: Map<string, FullEvent>;
    readonly spaceChannels: Set<string>;
    readonly userInvitedStreams: Set<string>;
    readonly userJoinedStreams: Set<string>;
    readonly leafEventHashes: Set<string>;
    constructor(streamId: string, inceptionEvent: FullEvent | undefined);
    private addEvent;
    addEvents(events: FullEvent[], emitter?: TypedEmitter<StreamEvents>, init?: boolean): void;
}
export declare const rollupStream: (streamId: string, events: FullEvent[], emitter?: TypedEmitter<StreamEvents>) => StreamStateView;
//# sourceMappingURL=streams.d.ts.map