"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEvent = void 0;
const core_1 = require("@zion/core");
const addEvent = async (server, params) => {
    (0, core_1.checkEvent)(params.event, null);
    const events = await server.store.getEventStream(params.streamId);
    const rollup = (0, core_1.rollupStream)(params.streamId, events.events);
    // TODO: for now very naive chaining - first event of the bundle must referece any of the previous events in stream.
    (0, core_1.check)(params.event.base.prevEvents.length > 0, 'No prevEventHashes', core_1.Err.BAD_PREV_EVENTS);
    for (const hash of params.event.base.prevEvents) {
        (0, core_1.check)(rollup.events.has(hash), 'Invalid prevEvents', core_1.Err.BAD_PREV_EVENTS);
    }
    switch (params.event.base.payload.kind) {
        case 'inception':
            (0, core_1.throwWithCode)('Inception event cannot be added', core_1.Err.BAD_EVENT);
        case 'user-invited':
        case 'user-joined':
        case 'user-left':
        case 'channel-created':
        case 'channel-deleted':
            (0, core_1.throwWithCode)('Derived event cannot be added by user', core_1.Err.BAD_EVENT);
        case 'join':
        case 'invite':
        case 'leave':
            return addJoinAndFriendsEvent(server, params, rollup);
        case 'message':
            return addMessageEvent(server, params, rollup);
        default:
            const c = params.event.base.payload;
            (0, core_1.throwWithCode)(`Unhandled event kind: ${c}`, core_1.Err.INTERNAL_ERROR_SWITCH);
    }
};
exports.addEvent = addEvent;
const addJoinAndFriendsEvent = async (server, params, rollup) => {
    (0, core_1.check)(rollup.streamKind === 'space' || rollup.streamKind === 'channel', 'Must be space or channel stream', core_1.Err.BAD_EVENT);
    const { streamId } = params;
    const { creatorAddress, payload } = params.event.base;
    (0, core_1.check)(payload.kind === 'join' || payload.kind === 'invite' || payload.kind === 'leave', 'Must be join/invite/leave', core_1.Err.BAD_EVENT);
    // TODO: can user join somebody other than yourself?
    // TODO: can user invite yourself?
    const { userId } = payload;
    const userStreamId = (0, core_1.makeUserStreamId)(userId);
    const userStream = await server.store.getEventStream(userStreamId);
    const prevHashes = (0, core_1.findLeafEventHashes)(streamId, userStream.events);
    server.store.addEvents(params.streamId, [params.event]);
    const eventRef = (0, core_1.makeEventRef)(streamId, params.event);
    let derivedEvent;
    switch (payload.kind) {
        case 'join':
            // TODO: hash
            derivedEvent = (0, core_1.makeEvent)(server.wallet, { kind: 'user-joined', streamId, eventRef }, prevHashes);
            break;
        case 'invite':
            derivedEvent = (0, core_1.makeEvent)(server.wallet, { kind: 'user-invited', streamId, inviterId: creatorAddress, eventRef }, prevHashes);
            break;
        case 'leave':
            derivedEvent = (0, core_1.makeEvent)(server.wallet, { kind: 'user-left', streamId, eventRef }, prevHashes);
            break;
        default:
            const c = payload;
            (0, core_1.throwWithCode)(`Unhandled event kind: ${c}`, core_1.Err.INTERNAL_ERROR_SWITCH);
    }
    server.store.addEvents(userStreamId, [derivedEvent]);
    return {};
};
const addMessageEvent = async (server, params, rollup) => {
    (0, core_1.check)(rollup.streamKind === 'channel', 'Must be channel stream', core_1.Err.BAD_EVENT);
    (0, core_1.check)(rollup.joinedUsers.has(params.event.base.creatorAddress), 'Not joined', core_1.Err.USER_CANT_POST);
    server.store.addEvents(params.streamId, [params.event]);
    return {};
};
