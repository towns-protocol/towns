"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const ethers_1 = require("ethers");
const nanoid_1 = require("nanoid");
const app_1 = require("../app");
const util_test_1 = require("./util.test");
(0, globals_1.describe)('BasicRpcTest', () => {
    let zionApp;
    (0, globals_1.beforeAll)(async () => {
        zionApp = (0, app_1.startZionApp)(0);
    });
    (0, globals_1.afterAll)(async () => {
        await zionApp.stop();
    });
    let bobsWallet;
    beforeEach(async () => {
        bobsWallet = ethers_1.Wallet.createRandom();
    });
    const testParams = () => (0, util_test_1.makeTestParams)(() => zionApp);
    globals_1.test.each(testParams())('errorCodeTransmitted-%s', async (method, service) => {
        const bob = service();
        await (0, globals_1.expect)(bob.createUser({
            events: [
                (0, core_1.makeEvent)(bobsWallet, {
                    kind: 'inception',
                    streamId: 'foo',
                    data: { streamKind: core_1.StreamKind.User },
                }, []),
            ],
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_STREAM_ID }));
        await (0, globals_1.expect)(bob.createUser({
            events: [],
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_STREAM_CREATION_PARAMS }));
    });
    globals_1.test.each(testParams())('cantAddWithBadhHash-%s', async (method, service) => {
        const log = (0, debug_1.default)(`test:BasicRpcTest:cantAddWithBadhHash-${method}`);
        const bob = service();
        await bob.createUser({
            events: [
                (0, core_1.makeEvent)(bobsWallet, {
                    kind: 'inception',
                    streamId: (0, core_1.makeUserStreamId)(bobsWallet.address),
                    data: { streamKind: core_1.StreamKind.User },
                }, []),
            ],
        });
        log('Bob created user, about to create space');
        // Bob creates space and channel
        const spaceId = (0, core_1.makeSpaceStreamId)('bobs-space-' + (0, nanoid_1.nanoid)());
        await bob.createSpace({
            events: (0, core_1.makeEvents)(bobsWallet, [
                {
                    kind: 'inception',
                    streamId: spaceId,
                    data: { streamKind: core_1.StreamKind.Space },
                },
                {
                    kind: 'join',
                    userId: bobsWallet.address,
                },
            ], []),
        });
        log('Bob created space, about to create channel');
        const channelId = (0, core_1.makeSpaceStreamId)('bobs-channel-' + (0, nanoid_1.nanoid)());
        const channelEvents = (0, core_1.makeEvents)(bobsWallet, [
            {
                kind: 'inception',
                streamId: channelId,
                data: { streamKind: core_1.StreamKind.Channel, spaceId },
            },
            {
                kind: 'join',
                userId: bobsWallet.address,
            },
        ], []);
        await bob.createChannel({
            events: channelEvents,
        });
        log('Bob fails to create channel with badly chained initial events, hash empty');
        const channelId2 = (0, core_1.makeSpaceStreamId)('bobs-channel2-' + (0, nanoid_1.nanoid)());
        const channelEvent2_0 = (0, core_1.makeEvent)(bobsWallet, {
            kind: 'inception',
            streamId: channelId2,
            data: { streamKind: core_1.StreamKind.Channel, spaceId },
        }, []);
        const channelEvent2_1 = (0, util_test_1.makeEvent_test)(bobsWallet, {
            kind: 'join',
            userId: bobsWallet.address,
        }, []);
        await (0, globals_1.expect)(bob.createChannel({
            events: [channelEvent2_0, channelEvent2_1],
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_PREV_EVENTS }));
        log('Bob fails to create channel with badly chained initial events, wrong hash value');
        const channelEvent2_2 = (0, core_1.makeEvent)(bobsWallet, {
            kind: 'join',
            userId: bobsWallet.address,
        }, [channelEvent2_1.hash]);
        await (0, globals_1.expect)(bob.createChannel({
            events: [channelEvent2_0, channelEvent2_2],
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_PREV_EVENTS }));
        log('Bob adds event with correct hash');
        const messageEvent = (0, core_1.makeEvent)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
            channelEvents[1].hash,
        ]);
        await bob.addEvent({
            streamId: channelId,
            event: messageEvent,
        });
        log('Bob fails to add event with empty hash');
        await (0, globals_1.expect)(bob.addEvent({
            streamId: channelId,
            event: (0, util_test_1.makeEvent_test)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, []),
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_PREV_EVENTS }));
        log('Bob fails to add event with wrong hash');
        await (0, globals_1.expect)(bob.addEvent({
            streamId: channelId,
            event: (0, core_1.makeEvent)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
                channelEvent2_0.hash,
            ]),
        })).rejects.toThrow(globals_1.expect.objectContaining({ code: core_1.Err.BAD_PREV_EVENTS }));
    });
});
