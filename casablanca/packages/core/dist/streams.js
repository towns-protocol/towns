"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupStream = exports.StreamStateView = exports.findLeafEventHashes = void 0;
const check_1 = require("./check");
const err_1 = require("./err");
const findLeafEventHashes = (streamId, events) => {
    (0, check_1.check)(events.length > 0, `Stream is empty ${streamId}`, err_1.Err.STREAM_BAD_HASHES);
    const hashes = new Set();
    for (const event of events) {
        hashes.add(event.hash);
        for (const prev of event.base.prevEvents) {
            hashes.delete(prev);
        }
    }
    (0, check_1.check)(hashes.size > 0, `No leaf event found in ${streamId}`, err_1.Err.STREAM_BAD_HASHES);
    return [...hashes];
};
exports.findLeafEventHashes = findLeafEventHashes;
class StreamStateView {
    streamId;
    streamKind;
    events = new Map();
    joinedUsers = new Set();
    invitedUsers = new Set();
    messages = new Map();
    spaceChannels = new Set();
    userInvitedStreams = new Set();
    userJoinedStreams = new Set();
    leafEventHashes = new Set();
    constructor(streamId, inceptionEvent) {
        (0, check_1.check)(inceptionEvent !== undefined, `Stream is empty ${streamId}`, err_1.Err.STREAM_EMPTY);
        (0, check_1.check)(inceptionEvent.base.payload.kind === 'inception', `First event is not inception ${streamId}`, err_1.Err.STREAM_BAD_EVENT);
        this.streamId = streamId;
        this.streamKind = inceptionEvent.base.payload.data.streamKind;
    }
    addEvent(event, emitter) {
        // TODO: is there need to check event validity and chaining here?
        this.events.set(event.hash, event);
        this.leafEventHashes.add(event.hash);
        for (const prev of event.base.prevEvents) {
            this.leafEventHashes.delete(prev);
        }
        const { payload } = event.base;
        switch (payload.kind) {
            case 'inception':
                emitter?.emit('streamInception', this.streamId, payload.data.streamKind);
                break;
            case 'join':
                this.joinedUsers.add(payload.userId);
                emitter?.emit('streamNewUserJoined', this.streamId, payload.userId);
                break;
            case 'invite':
                this.invitedUsers.add(payload.userId);
                emitter?.emit('streamNewUserInvited', this.streamId, payload.userId);
                break;
            case 'leave':
                emitter?.emit('streamUserLeft', this.streamId, payload.userId);
                this.joinedUsers.delete(payload.userId);
                this.invitedUsers.delete(payload.userId);
                break;
            case 'user-invited':
                this.userInvitedStreams.add(payload.streamId);
                emitter?.emit('userInvitedToStream', payload.streamId);
                break;
            case 'user-joined':
                this.userJoinedStreams.add(payload.streamId);
                emitter?.emit('userJoinedStream', payload.streamId);
                break;
            case 'user-left':
                emitter?.emit('userLeftStream', payload.streamId);
                this.userJoinedStreams.delete(payload.streamId);
                break;
            case 'channel-created':
                this.spaceChannels.add(payload.channelId);
                emitter?.emit('spaceNewChannelCreated', this.streamId, payload.channelId);
                break;
            case 'channel-deleted':
                emitter?.emit('spaceChannelDeleted', this.streamId, payload.channelId);
                this.spaceChannels.delete(payload.channelId);
                break;
            case 'message':
                this.messages.set(event.hash, event);
                emitter?.emit('channelNewMessage', this.streamId, event);
                break;
            default:
                const c = payload;
                (0, check_1.throwWithCode)(`Unhandled event kind: ${c}`, err_1.Err.INTERNAL_ERROR_SWITCH);
        }
    }
    addEvents(events, emitter, init) {
        for (const event of events) {
            this.addEvent(event, emitter);
        }
        if (emitter !== undefined) {
            if (init ?? false) {
                emitter.emit('streamInitialized', this.streamId, this.streamKind, events);
            }
            else {
                emitter.emit('streamUpdated', this.streamId, events);
            }
        }
    }
}
exports.StreamStateView = StreamStateView;
const rollupStream = (streamId, events, emitter) => {
    const ret = new StreamStateView(streamId, events[0]);
    ret.addEvents(events, emitter, true);
    return ret;
};
exports.rollupStream = rollupStream;
