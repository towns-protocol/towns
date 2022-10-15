"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const client_1 = require("@zion/client");
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const ethers_1 = require("ethers");
const nanoid_1 = require("nanoid");
const app_1 = require("../app");
const log = (0, debug_1.default)('test');
(0, globals_1.describe)('BobAndAliceSendAMessageViaClient', () => {
    let zionApp;
    (0, globals_1.beforeAll)(async () => {
        zionApp = (0, app_1.startZionApp)(0);
    });
    (0, globals_1.afterAll)(async () => {
        await zionApp.stop();
    });
    let bobsWallet;
    let alicesWallet;
    (0, globals_1.beforeEach)(async () => {
        bobsWallet = ethers_1.Wallet.createRandom();
        alicesWallet = ethers_1.Wallet.createRandom();
    });
    const bobCanReconnect = async () => {
        const rpcClient = (0, client_1.makeZionRpcClient)(zionApp.url);
        const bobsClient = new client_1.Client(bobsWallet, rpcClient);
        let resolve;
        let reject;
        const done = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const onChannelNewMessage = (channelId, message) => {
            log('channelNewMessage', channelId);
            log(message);
            try {
                const payload = message.base.payload;
                (0, globals_1.expect)(payload.text).toBe('Hello, again!');
                resolve('done');
            }
            catch (e) {
                reject(e);
            }
        };
        const onStreamInitialized = (streamId, streamKind) => {
            log('streamInitialized', streamId, streamKind);
            try {
                if (streamKind === core_1.StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId);
                    log('channel content');
                    log(channel.rollup);
                    (0, globals_1.expect)(Array.from(channel.rollup.messages.values())).toEqual(globals_1.expect.arrayContaining([
                        globals_1.expect.objectContaining({
                            base: globals_1.expect.objectContaining({
                                payload: globals_1.expect.objectContaining({ text: 'Hello, world!' }),
                            }),
                        }),
                    ]));
                    channel.on('channelNewMessage', onChannelNewMessage);
                    bobsClient.sendMessage(streamId, 'Hello, again!');
                }
            }
            catch (e) {
                reject(e);
            }
        };
        bobsClient.on('streamInitialized', onStreamInitialized);
        await (0, globals_1.expect)(bobsClient.loadExistingUser()).resolves.toBeUndefined();
        bobsClient.startSync(1000);
        await (0, globals_1.expect)(done).resolves.toBe('done');
        await bobsClient.stopSync();
        return 'done';
    };
    (0, globals_1.test)('bobTalksToHimself', async () => {
        const rpcClient = (0, client_1.makeZionRpcClient)(zionApp.url);
        const bobsClient = new client_1.Client(bobsWallet, rpcClient);
        let resolve;
        let reject;
        const done = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const onChannelNewMessage = (channelId, message) => {
            log('channelNewMessage', channelId);
            log(message);
            try {
                const payload = message.base.payload;
                (0, globals_1.expect)(payload.text).toBe('Hello, world!');
                resolve('done');
            }
            catch (e) {
                reject(e);
            }
        };
        const onStreamInitialized = (streamId, streamKind) => {
            log('streamInitialized', streamId, streamKind);
            try {
                if (streamKind === core_1.StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId);
                    log('channel content');
                    log(channel.rollup);
                    channel.on('channelNewMessage', onChannelNewMessage);
                    bobsClient.sendMessage(streamId, 'Hello, world!');
                }
            }
            catch (e) {
                reject(e);
            }
        };
        bobsClient.on('streamInitialized', onStreamInitialized);
        await (0, globals_1.expect)(bobsClient.createNewUser()).resolves.toBeUndefined();
        bobsClient.startSync(1000);
        const bobsSpaceId = (0, core_1.makeSpaceStreamId)('bobs-space-' + (0, nanoid_1.nanoid)());
        await (0, globals_1.expect)(bobsClient.createSpace(bobsSpaceId)).resolves.toBeUndefined();
        await (0, globals_1.expect)(bobsClient.createChannel((0, core_1.makeChannelStreamId)('bobs-channel-' + (0, nanoid_1.nanoid)()), bobsSpaceId)).resolves.toBeUndefined();
        await (0, globals_1.expect)(done).resolves.toBe('done');
        await bobsClient.stopSync();
        log('pass1 done');
        await (0, globals_1.expect)(bobCanReconnect()).resolves.toBe('done');
        log('pass2 done');
    });
});
