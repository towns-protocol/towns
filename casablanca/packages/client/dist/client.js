"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = exports.Stream = void 0;
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const events_1 = __importDefault(require("events"));
const logCall = (0, debug_1.default)('zion:client:call');
const logSync = (0, debug_1.default)('zion:client:sync');
const logEmitFromStream = (0, debug_1.default)('zion:client:emit:stream');
const logEmitFromClient = (0, debug_1.default)('zion:client:emit:client');
const logEvent = (0, debug_1.default)('zion:client:event');
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
class Stream extends events_1.default {
    streamId;
    syncCookie;
    clientEmitter;
    rollup;
    constructor(streamId, inceptionEvent, clientEmitter) {
        super();
        this.streamId = streamId;
        this.clientEmitter = clientEmitter;
        this.rollup = new core_1.StreamStateView(streamId, inceptionEvent);
    }
    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     * @param events
     * @param emitter
     */
    addEvents(streamAndCookie, init) {
        // TODO: perhaps here save rollup and emit events only if rollup is successful
        assert(this.syncCookie === streamAndCookie.originalSyncCookie, 'syncCookie mismatch');
        this.rollup.addEvents(streamAndCookie.events, this, init);
        this.syncCookie = streamAndCookie.syncCookie;
    }
    emit(event, ...args) {
        logEmitFromStream(event, ...args);
        this.clientEmitter.emit(event, ...args);
        return super.emit(event, ...args);
    }
}
exports.Stream = Stream;
class Client extends events_1.default {
    wallet;
    rpcClient;
    userStreamId;
    streams = {};
    stopSyncResolve;
    constructor(wallet, rpcClient) {
        super();
        this.wallet = wallet;
        this.rpcClient = rpcClient;
        logCall('new Client', this.address);
    }
    get address() {
        return this.wallet.address;
    }
    stream(streamId) {
        return this.streams[streamId];
    }
    async initUserStream(streamId, streamAndCookie) {
        assert(this.userStreamId === undefined, 'streamId must not be set');
        this.userStreamId = streamId;
        const stream = new Stream(streamId, streamAndCookie.events[0], this);
        this.streams[streamId] = stream;
        stream.addEvents(streamAndCookie);
        stream.on('userJoinedStream', this.onJoinedStream);
        stream.on('userLeftStream', this.onLeftStream);
        return Promise.all(Array.from(stream.rollup.userJoinedStreams).map((streamId) => this.initStream(streamId))).then(() => { });
    }
    async createNewUser() {
        logCall('createNewUser', this.address);
        assert(this.userStreamId === undefined, 'streamId must not be set');
        const streamId = (0, core_1.makeUserStreamId)(this.address);
        const events = [
            (0, core_1.makeEvent)(this.wallet, {
                kind: 'inception',
                streamId,
                data: { streamKind: core_1.StreamKind.User },
            }, []),
        ];
        const { syncCookie } = await this.rpcClient.createUser({
            events,
        });
        return this.initUserStream(streamId, { events, syncCookie });
    }
    async loadExistingUser() {
        logCall('loadExistingUser', this.address);
        assert(this.userStreamId === undefined, 'streamId must not be set');
        const streamId = (0, core_1.makeUserStreamId)(this.address);
        const userStream = await this.rpcClient.getEventStream({ streamId });
        return this.initUserStream(streamId, userStream);
    }
    async createSpace(spaceId) {
        logCall('createSpace', this.address, spaceId);
        assert(this.userStreamId !== undefined, 'streamId must be set');
        assert((0, core_1.isSpaceStreamId)(spaceId), 'spaceId must be a valid streamId');
        const inceptionEvent = (0, core_1.makeEvent)(this.wallet, {
            kind: 'inception',
            streamId: spaceId,
            data: { streamKind: core_1.StreamKind.Space },
        }, []);
        const joinEvent = (0, core_1.makeEvent)(this.wallet, {
            kind: 'join',
            userId: this.address,
        }, [inceptionEvent.hash]);
        await this.rpcClient.createSpace({
            events: [inceptionEvent, joinEvent],
        });
    }
    async createChannel(channelId, spaceId) {
        logCall('createChannel', this.address, channelId, spaceId);
        assert(this.userStreamId !== undefined, 'userStreamId must be set');
        assert((0, core_1.isChannelStreamId)(channelId), 'channelId must be a valid streamId');
        const inceptionEvent = (0, core_1.makeEvent)(this.wallet, {
            kind: 'inception',
            streamId: channelId,
            data: { streamKind: core_1.StreamKind.Channel, spaceId },
        }, []);
        const joinEvent = (0, core_1.makeEvent)(this.wallet, {
            kind: 'join',
            userId: this.address,
        }, [inceptionEvent.hash]);
        await this.rpcClient.createChannel({
            events: [inceptionEvent, joinEvent],
        });
    }
    async initStream(streamId) {
        const streamContent = await this.rpcClient.getEventStream({ streamId });
        const stream = new Stream(streamId, streamContent.events[0], this);
        this.streams[streamId] = stream;
        stream.addEvents(streamContent, true);
    }
    onJoinedStream = async (streamId) => {
        logEvent('onJoinedStream', this.address, streamId);
        return this.initStream(streamId);
    };
    onLeftStream = async (streamId) => {
        logEvent('onLeftStream', this.address, streamId);
        // TODO: implement
    };
    async startSync(timeoutMs) {
        logSync('sync START', this.address);
        assert(this.stopSyncResolve === undefined, 'sync already started');
        const stop = new Promise((resolve) => {
            this.stopSyncResolve = resolve;
        });
        while (this.stopSyncResolve !== undefined) {
            const syncPositions = [];
            for (const streamId in this.streams) {
                const syncCookie = this.streams[streamId].syncCookie;
                if (syncCookie !== undefined) {
                    syncPositions.push({
                        streamId,
                        syncCookie,
                    });
                }
            }
            logSync('sync CALL', this.address, 'numStreams=', syncPositions.length);
            const sync = await Promise.race([
                this.rpcClient.syncStreams({
                    syncPositions,
                    timeoutMs: timeoutMs ?? 29000, // TODO: from config
                }),
                stop,
            ]);
            if (typeof sync === 'string') {
                logSync('sync CANCEL', this.address);
                this.stopSyncResolve = undefined;
                break;
            }
            logSync('sync RESULTS', this.address);
            Object.entries(sync.streams).forEach(([streamId, streamAndCookie]) => {
                logSync('sync got stream', this.address, streamId, 'events=', streamAndCookie.events.length, 'syncCookie=', streamAndCookie.syncCookie, 'originalSyncCookie=', streamAndCookie.originalSyncCookie);
                const stream = this.streams[streamId];
                if (stream === undefined) {
                    return;
                }
                stream.addEvents(streamAndCookie);
            });
        }
        logSync('sync END', this.address);
    }
    stopSync() {
        logSync('sync STOP CALLED', this.address);
        assert(this.stopSyncResolve !== undefined, 'sync not started');
        this.stopSyncResolve('cancel');
        this.stopSyncResolve = undefined;
        logSync('sync STOP DONE', this.address);
    }
    emit(event, ...args) {
        logEmitFromClient(event, ...args);
        return super.emit(event, ...args);
    }
    async sendMessage(streamId, text) {
        // TODO: do not log message for PII reasons
        logCall('sendMessage', this.address, streamId, text);
        assert(this.userStreamId !== undefined, 'userStreamId must be set');
        const stream = this.streams[streamId];
        assert(stream !== undefined, 'unknown stream ' + streamId);
        const event = (0, core_1.makeEvent)(this.wallet, {
            kind: 'message',
            text,
        }, Array.from(stream.rollup.leafEventHashes));
        await this.rpcClient.addEvent({
            streamId,
            event,
        });
    }
}
exports.Client = Client;
