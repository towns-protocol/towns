"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startZionApp = exports.makeExpressApp = exports.makeJSONRPCServer = void 0;
const core_1 = require("@zion/core");
const body_parser_1 = __importDefault(require("body-parser"));
const debug_1 = __importDefault(require("debug"));
const ethers_1 = require("ethers");
const express_1 = __importDefault(require("express"));
const json_rpc_2_0_1 = require("json-rpc-2.0");
const dumbActionGuard_1 = require("./dumbActionGuard");
const redisEventStore_1 = require("./redisEventStore");
const server_1 = require("./server");
const log_rpc = (0, debug_1.default)('zion:rpc');
const log_http = (0, debug_1.default)('zion:http');
const makeJSONRPCServer = (zionServer) => {
    const server = new json_rpc_2_0_1.JSONRPCServer({ errorListener: () => { } });
    // Iterate through all methods on the service and add them to the JSONRPCServer with zion_ prefix
    Object.getOwnPropertyNames(core_1.ZionServicePrototype.prototype).forEach((method) => {
        if (method === 'constructor') {
            return;
        }
        server.addMethod('zion_' + method, async (params) => {
            log_rpc('Calling', method, 'params', params);
            try {
                const ret = await Reflect.apply(zionServer[method], zionServer, [params]);
                log_rpc('Returning', method, ret);
                return ret;
            }
            catch (e) {
                log_rpc('Returning error', method, e?.message ?? e);
                throw e;
            }
        });
    });
    return server;
};
exports.makeJSONRPCServer = makeJSONRPCServer;
const makeExpressApp = (server) => {
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.json());
    app.post('/json-rpc', async (request, response) => {
        const jsonRPCRequest = request.body.body;
        log_http('Received JSON-RPC request:', jsonRPCRequest);
        const jsonRPCResponse = await server.receiveJSON(jsonRPCRequest);
        log_http('Sending JSON-RPC response:', jsonRPCResponse);
        if (jsonRPCResponse) {
            response.json(jsonRPCResponse);
        }
        else {
            // If response is absent, it was a JSON-RPC notification method.
            // Respond with no content status (204).
            response.sendStatus(204);
        }
    });
    return app;
};
exports.makeExpressApp = makeExpressApp;
const startZionApp = (port) => {
    const wallet = ethers_1.Wallet.createRandom(); // TODO: use config
    const store = new redisEventStore_1.RedisEventStore();
    const zionServer = new server_1.ZionServer(wallet, store, new dumbActionGuard_1.DumbActionGuard());
    const express = (0, exports.makeExpressApp)((0, exports.makeJSONRPCServer)(zionServer));
    const appServer = express.listen(port);
    const addr = appServer.address();
    const url = `http://[${addr.address}]:${addr.port}/json-rpc`;
    return {
        wallet,
        express,
        appServer,
        zionServer,
        url,
        stop: async () => {
            appServer.close();
            await store.close();
        },
    };
};
exports.startZionApp = startZionApp;
