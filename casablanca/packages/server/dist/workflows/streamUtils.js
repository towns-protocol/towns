"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addJoinedEventToUserStream = exports.checkStreamCreationParams = void 0;
const core_1 = require("@zion/core");
/**
 * @returns streamId
 */
const checkStreamCreationParams = async (server, events, expectedStreamKind, expectedExtraEvent) => {
    (0, core_1.checkEvents)(events);
    (0, core_1.check)(events.length > 0, 'Must include inception event', core_1.Err.BAD_STREAM_CREATION_PARAMS);
    const inception = events[0].base;
    (0, core_1.check)(inception.payload.kind === 'inception', 'First event must be inception', core_1.Err.BAD_STREAM_CREATION_PARAMS);
    (0, core_1.check)(inception.payload.data.streamKind === expectedStreamKind, 'Wrong stream kind', core_1.Err.BAD_STREAM_CREATION_PARAMS);
    const streamId = inception.payload.streamId;
    (0, core_1.check)((0, core_1.isValidStreamId)(streamId), 'Invalid streamId', core_1.Err.BAD_STREAM_ID);
    const expectedLength = expectedExtraEvent !== undefined ? 2 : 1;
    (0, core_1.check)(events.length === expectedLength, 'Wrong number of events', core_1.Err.BAD_STREAM_CREATION_PARAMS);
    if (expectedExtraEvent !== undefined) {
        const second = events[1].base;
        (0, core_1.check)(second.payload.kind === expectedExtraEvent, 'Second event must be ' + expectedExtraEvent, core_1.Err.BAD_STREAM_CREATION_PARAMS);
        (0, core_1.check)(second.creatorAddress === inception.creatorAddress, 'creatorAddress mismatch', core_1.Err.BAD_STREAM_CREATION_PARAMS);
        if (second.payload.kind === 'join') {
            (0, core_1.check)(second.creatorAddress === second.payload.userId, 'User must join space or channel created by them', core_1.Err.BAD_STREAM_CREATION_PARAMS);
        }
    }
    (0, core_1.check)(!(await server.store.streamExists(streamId)), `Stream already exists: ${streamId}`, core_1.Err.STREAM_ALREADY_EXISTS);
    return streamId;
};
exports.checkStreamCreationParams = checkStreamCreationParams;
const addJoinedEventToUserStream = async (server, streamId, joinEvent) => {
    const userStreamId = (0, core_1.makeUserStreamId)(joinEvent.base.payload.userId);
    const { events } = await server.store.getEventStream(userStreamId);
    await server.store.addEvents(userStreamId, [
        (0, core_1.makeEvent)(server.wallet, {
            kind: 'user-joined',
            streamId,
            eventRef: (0, core_1.makeEventRef)(streamId, joinEvent),
        }, (0, core_1.findLeafEventHashes)(userStreamId, events)),
    ]);
};
exports.addJoinedEventToUserStream = addJoinedEventToUserStream;
