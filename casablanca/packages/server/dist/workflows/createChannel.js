"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChannel = void 0;
const core_1 = require("@zion/core");
const streamUtils_1 = require("./streamUtils");
const createChannel = async (server, { events }) => {
    const channelId = await (0, streamUtils_1.checkStreamCreationParams)(server, events, core_1.StreamKind.Channel, 'join');
    const syncCookie = await server.store.createEventStream(channelId, events);
    // Add corresponding event to space stream
    const payload = events[0].base.payload;
    const spaceId = payload.data.spaceId;
    const spaceStream = await server.store.getEventStream(spaceId);
    await server.store.addEvents(spaceId, [
        (0, core_1.makeEvent)(server.wallet, {
            kind: 'channel-created',
            channelId,
            eventRef: (0, core_1.makeEventRef)(channelId, events[0]),
        }, (0, core_1.findLeafEventHashes)(spaceId, spaceStream.events)),
    ]);
    // Add corresponding event to the user stream
    await (0, streamUtils_1.addJoinedEventToUserStream)(server, channelId, events[1]);
    return { syncCookie };
};
exports.createChannel = createChannel;
