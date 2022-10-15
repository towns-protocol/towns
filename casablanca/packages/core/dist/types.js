"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = exports.ZionServicePrototype = exports.isValidStreamId = exports.isChannelStreamId = exports.isSpaceStreamId = exports.isUserStreamId = exports.makeChannelStreamId = exports.makeSpaceStreamId = exports.makeUserStreamId = exports.makeStreamId = exports.allowedStreamPrefixes = exports.SteamPrefix = exports.StreamKind = void 0;
var StreamKind;
(function (StreamKind) {
    StreamKind["User"] = "user";
    StreamKind["Space"] = "space";
    StreamKind["Channel"] = "channel";
})(StreamKind = exports.StreamKind || (exports.StreamKind = {}));
// Stream kind is set in inception payload explicitely as StreamKind in data.streamKind field.
// Stream ids are prefixed with the kind of the stream to make it easier to
// reason about data in logs, tests, etc.
var SteamPrefix;
(function (SteamPrefix) {
    SteamPrefix["User"] = "zuser-";
    SteamPrefix["Space"] = "zspace-";
    SteamPrefix["Channel"] = "zchannel-";
})(SteamPrefix = exports.SteamPrefix || (exports.SteamPrefix = {}));
const allowedStreamPrefixes = () => Object.values(SteamPrefix);
exports.allowedStreamPrefixes = allowedStreamPrefixes;
const makeStreamId = (prefix, identity) => prefix + identity;
exports.makeStreamId = makeStreamId;
const makeUserStreamId = (identity) => (0, exports.makeStreamId)(SteamPrefix.User, identity);
exports.makeUserStreamId = makeUserStreamId;
const makeSpaceStreamId = (identity) => (0, exports.makeStreamId)(SteamPrefix.Space, identity);
exports.makeSpaceStreamId = makeSpaceStreamId;
const makeChannelStreamId = (identity) => (0, exports.makeStreamId)(SteamPrefix.Channel, identity);
exports.makeChannelStreamId = makeChannelStreamId;
const isUserStreamId = (streamId) => streamId.startsWith(SteamPrefix.User);
exports.isUserStreamId = isUserStreamId;
const isSpaceStreamId = (streamId) => streamId.startsWith(SteamPrefix.Space);
exports.isSpaceStreamId = isSpaceStreamId;
const isChannelStreamId = (streamId) => streamId.startsWith(SteamPrefix.Channel);
exports.isChannelStreamId = isChannelStreamId;
const isValidStreamId = (streamId) => (0, exports.allowedStreamPrefixes)().some((prefix) => streamId.startsWith(prefix));
exports.isValidStreamId = isValidStreamId;
class ZionServicePrototype {
    async createUser(params) {
        throw new Error('Do not use service prototype');
    }
    async createSpace(params) {
        throw new Error('Do not use service prototype');
    }
    async createChannel(params) {
        throw new Error('Do not use service prototype');
    }
    async getEventStream(params) {
        throw new Error('Do not use service prototype');
    }
    async addEvent(params) {
        throw new Error('Do not use service prototype');
    }
    async syncStreams(params) {
        throw new Error('Do not use service prototype');
    }
}
exports.ZionServicePrototype = ZionServicePrototype;
var Action;
(function (Action) {
    Action["CreateSpace"] = "createSpace";
    Action["CreateChannel"] = "createChannel";
    Action["Invite"] = "invite";
    Action["Join"] = "join";
    Action["Read"] = "read";
    Action["Post"] = "post";
})(Action = exports.Action || (exports.Action = {}));
