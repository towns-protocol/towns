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
const log = (0, debug_1.default)('test:bobAndAliceSendAMessage');
(0, globals_1.describe)('BobAndAliceSendAMessageViaRpc', () => {
    let zionApp;
    (0, globals_1.beforeAll)(async () => {
        zionApp = (0, app_1.startZionApp)(0);
    });
    (0, globals_1.afterAll)(async () => {
        await zionApp.stop();
    });
    let bobsWallet;
    let alicesWallet;
    beforeEach(async () => {
        bobsWallet = ethers_1.Wallet.createRandom();
        alicesWallet = ethers_1.Wallet.createRandom();
    });
    const testParams = () => (0, util_test_1.makeTestParams)(() => zionApp);
    globals_1.test.each(testParams())('bobTalksToHimself-%s', async (method, makeService) => {
        log('bobTalksToHimself', method, 'start');
        const bob = makeService();
        await bob.createUser({
            events: [
                (0, core_1.makeEvent)(bobsWallet, {
                    kind: 'inception',
                    streamId: (0, core_1.makeUserStreamId)(bobsWallet.address),
                    data: { streamKind: core_1.StreamKind.User },
                }, []),
            ],
        });
        log('bobTalksToHimself Bob created user, about to create space');
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
        log('bobTalksToHimself Bob created space, about to create channel');
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
        // Bob reads stream to get sync cookie.
        log('bobTalksToHimself Bob created channel, reads it back');
        const channel = await bob.getEventStream({ streamId: channelId });
        // Bob starts sync on the channel
        log('bobTalksToHimself Bob starts sync');
        let syncResult = null;
        const syncPromise = bob
            .syncStreams({
            syncPositions: [
                {
                    streamId: channelId,
                    syncCookie: channel.syncCookie,
                },
            ],
            timeoutMs: 29000,
        })
            .then((result) => {
            syncResult = result;
            return 'done';
        });
        expect(syncResult).toBeNull();
        // Bob succesdfully posts a message
        log('bobTalksToHimself Bob posts a message');
        const event = (0, core_1.makeEvent)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
            channelEvents[1].hash,
        ]);
        await bob.addEvent({
            streamId: channelId,
            event,
        });
        log('bobTalksToHimself Bob waits for sync to complete');
        // Bob sees the message in sync result
        await expect(syncPromise).resolves.toBe('done');
        expect(syncResult).not.toBeNull();
        expect(syncResult.streams).toHaveProperty(channelId);
        expect(syncResult.streams[channelId].events).toEqual([event]);
        log("bobTalksToHimself Bob can't post event without previous event hashes");
        const badEvent = (0, util_test_1.makeEvent_test)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, []);
        await expect(bob.addEvent({
            streamId: channelId,
            event: badEvent,
        })).rejects.toThrow();
        log('bobTalksToHimself done');
    });
    globals_1.test.each(testParams())('bobAndAliceSendAMessage-%s', async (method, makeService) => {
        const bob = makeService();
        const alice = makeService();
        // Create accounts for Bob and Alice
        await bob.createUser({
            events: [
                (0, core_1.makeEvent)(bobsWallet, {
                    kind: 'inception',
                    streamId: (0, core_1.makeUserStreamId)(bobsWallet.address),
                    data: { streamKind: core_1.StreamKind.User },
                }, []),
            ],
        });
        await alice.createUser({
            events: [
                (0, core_1.makeEvent)(alicesWallet, {
                    kind: 'inception',
                    streamId: (0, core_1.makeUserStreamId)(alicesWallet.address),
                    data: { streamKind: core_1.StreamKind.User },
                }, []),
            ],
        });
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
        let lastChannelHash = channelEvents[1].hash;
        // Bob succesdfully posts a message
        const firstMessage = (0, core_1.makeEvent)(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
            lastChannelHash,
        ]);
        lastChannelHash = firstMessage.hash;
        await bob.addEvent({
            streamId: channelId,
            event: firstMessage,
        });
        // Alice fails to post a message if she hasn't joined the channel
        await expect(alice.addEvent({
            streamId: channelId,
            event: (0, core_1.makeEvent)(alicesWallet, { kind: 'message', text: 'Hello, world!' }, [
                lastChannelHash,
            ]),
        })).rejects.toThrow();
        // Alice syncs her user stream waiting for invite
        const aliceStreamId = (0, core_1.makeUserStreamId)(alicesWallet.address);
        const userAlice = await alice.getEventStream({
            streamId: aliceStreamId,
        });
        let aliceSyncCookie = userAlice.syncCookie;
        let aliceSyncResult = null;
        let aliceSyncPromise = alice
            .syncStreams({
            syncPositions: [
                {
                    streamId: aliceStreamId,
                    syncCookie: aliceSyncCookie,
                },
            ],
            timeoutMs: 29000,
        })
            .then((result) => {
            aliceSyncResult = result;
            return 'done';
        });
        expect(aliceSyncResult).toBeNull();
        // Bob invites Alice to the channel
        // There are two different events: one is to the channel itself
        // and the other is to the user stream of the invitee to notify invitee.
        const inviteEventInChannel = (0, core_1.makeEvent)(bobsWallet, { kind: 'invite', userId: alicesWallet.address }, [lastChannelHash]);
        lastChannelHash = inviteEventInChannel.hash;
        await bob.addEvent({
            streamId: channelId,
            event: inviteEventInChannel,
        });
        // Alice sees the invite in her user stream
        await expect(aliceSyncPromise).resolves.toBe('done');
        expect(aliceSyncResult).not.toBeNull();
        expect(aliceSyncResult.streams).toHaveProperty(aliceStreamId);
        expect(aliceSyncResult.streams[aliceStreamId].events).toEqual(expect.arrayContaining([
            expect.objectContaining({
                base: expect.objectContaining({
                    payload: expect.objectContaining({
                        kind: 'user-invited',
                        streamId: channelId,
                        inviterId: bobsWallet.address,
                    }),
                }),
            }),
        ]));
        aliceSyncCookie = aliceSyncResult.streams[aliceStreamId].syncCookie;
        // Alice syncs her user stream again
        aliceSyncResult = null;
        aliceSyncPromise = alice
            .syncStreams({
            syncPositions: [
                {
                    streamId: aliceStreamId,
                    syncCookie: aliceSyncCookie,
                },
            ],
            timeoutMs: 29000,
        })
            .then((result) => {
            aliceSyncResult = result;
            return 'done';
        });
        expect(aliceSyncResult).toBeNull();
        // Alice joins the channel
        const joinEventInChannel = (0, core_1.makeEvent)(alicesWallet, { kind: 'join', userId: alicesWallet.address }, [lastChannelHash]);
        lastChannelHash = joinEventInChannel.hash;
        await alice.addEvent({
            streamId: channelId,
            event: joinEventInChannel,
        });
        // Alice sees derived join event in her user stream
        await expect(aliceSyncPromise).resolves.toBe('done');
        expect(aliceSyncResult).not.toBeNull();
        expect(aliceSyncResult.streams).toHaveProperty(aliceStreamId);
        expect(aliceSyncResult.streams[aliceStreamId].events).toEqual(expect.arrayContaining([
            expect.objectContaining({
                base: expect.objectContaining({
                    payload: expect.objectContaining({
                        kind: 'user-joined',
                        streamId: channelId,
                    }),
                }),
            }),
        ]));
        aliceSyncCookie = aliceSyncResult.streams[aliceStreamId].syncCookie;
        // Alice reads previouse messages from the channel
        const channel = await alice.getEventStream({ streamId: channelId });
        expect(channel.events).toEqual(expect.arrayContaining([
            expect.objectContaining({
                base: expect.objectContaining({
                    payload: expect.objectContaining({ text: 'Hello, world!' }),
                }),
            }),
        ]));
        // Alice syncs both her user stream and the channel
        aliceSyncResult = null;
        aliceSyncPromise = alice
            .syncStreams({
            syncPositions: [
                {
                    streamId: aliceStreamId,
                    syncCookie: aliceSyncCookie,
                },
                {
                    streamId: channelId,
                    syncCookie: channel.syncCookie,
                },
            ],
            timeoutMs: 29000,
        })
            .then((result) => {
            aliceSyncResult = result;
            return 'done';
        });
        expect(aliceSyncResult).toBeNull();
        // Bob posts another message
        await bob.addEvent({
            streamId: channelId,
            event: (0, core_1.makeEvent)(bobsWallet, { kind: 'message', text: 'Hello, Alice!' }, [
                lastChannelHash,
            ]),
        });
        // Alice sees the message in sync result
        await expect(aliceSyncPromise).resolves.toBe('done');
        expect(aliceSyncResult).not.toBeNull();
        expect(aliceSyncResult.streams).toHaveProperty(channelId);
        expect(aliceSyncResult.streams[channelId].events).toEqual(expect.arrayContaining([
            expect.objectContaining({
                base: expect.objectContaining({
                    payload: expect.objectContaining({ text: 'Hello, Alice!' }),
                }),
            }),
        ]));
    });
});
