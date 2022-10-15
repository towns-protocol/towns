"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZionServer = void 0;
const addEvent_1 = require("./workflows/addEvent");
const createChannel_1 = require("./workflows/createChannel");
const createSpace_1 = require("./workflows/createSpace");
const createUser_1 = require("./workflows/createUser");
class ZionServer {
    wallet;
    store;
    actionGuard;
    constructor(wallet, store, actionGuard) {
        this.wallet = wallet;
        this.store = store;
        this.actionGuard = actionGuard;
    }
    get address() {
        return this.wallet.address;
    }
    createUser(params) {
        return (0, createUser_1.createUser)(this, params);
    }
    createSpace(params) {
        return (0, createSpace_1.createSpace)(this, params);
    }
    createChannel(params) {
        return (0, createChannel_1.createChannel)(this, params);
    }
    async getEventStream(params) {
        return this.store.getEventStream(params.streamId);
    }
    async addEvent(params) {
        return (0, addEvent_1.addEvent)(this, params);
    }
    async syncStreams(params) {
        return { streams: await this.store.readNewEvents(params.syncPositions, params.timeoutMs) };
    }
}
exports.ZionServer = ZionServer;
