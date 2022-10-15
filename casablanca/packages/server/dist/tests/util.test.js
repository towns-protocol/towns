"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeTestParams = exports.makeEvent_test = void 0;
const util_1 = require("@ethereumjs/util");
const client_1 = require("@zion/client");
const core_1 = require("@zion/core");
const nanoid_1 = require("nanoid");
const config_1 = require("../config");
const makeEvent_test = (wallet, payload, prevEvents) => {
    const event = {
        creatorAddress: wallet.address,
        salt: (0, nanoid_1.nanoid)(),
        prevEvents: prevEvents,
        payload: payload,
    };
    const [hash, hashBuffer] = (0, core_1.hashEvent)(event);
    const { v, r, s } = (0, util_1.ecsign)(hashBuffer, Buffer.from(wallet.privateKey.slice(2), 'hex'));
    const signature = (0, util_1.toRpcSig)(v, r, s);
    return { hash, signature, base: event };
};
exports.makeEvent_test = makeEvent_test;
const makeTestParams = (zionApp) => {
    const ret = [
        ['direct', () => zionApp().zionServer],
        ['viaClient', () => (0, client_1.makeZionRpcClient)(zionApp().url)],
    ];
    if (config_1.config.testRemoteUrl !== undefined) {
        ret.push(['remote', () => (0, client_1.makeZionRpcClient)(config_1.config.testRemoteUrl)]);
    }
    return ret;
};
exports.makeTestParams = makeTestParams;
