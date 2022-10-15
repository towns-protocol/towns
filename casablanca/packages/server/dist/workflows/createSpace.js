"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpace = void 0;
const core_1 = require("@zion/core");
const streamUtils_1 = require("./streamUtils");
const createSpace = async (server, { events }) => {
    const streamId = await (0, streamUtils_1.checkStreamCreationParams)(server, events, core_1.StreamKind.Space, 'join');
    await (0, streamUtils_1.addJoinedEventToUserStream)(server, events[0].base.payload.streamId, events[1]);
    const syncCookie = await server.store.createEventStream(streamId, events);
    return { syncCookie };
};
exports.createSpace = createSpace;
