"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = void 0;
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const streamUtils_1 = require("./streamUtils");
const log = (0, debug_1.default)('server:createUser');
const createUser = async (server, { events }) => {
    log('server:createUser', events.length > 0 ? events[0] : null);
    const streamId = await (0, streamUtils_1.checkStreamCreationParams)(server, events, core_1.StreamKind.User);
    // TODO: check permissions
    (0, core_1.check)((0, core_1.makeUserStreamId)(events[0].base.creatorAddress) === streamId, 'streamId of user stream must match userId', core_1.Err.BAD_STREAM_CREATION_PARAMS);
    const syncCookie = await server.store.createEventStream(streamId, events);
    return { syncCookie };
};
exports.createUser = createUser;
