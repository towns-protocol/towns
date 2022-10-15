"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeZionRpcClient = void 0;
const core_1 = require("@zion/core");
const axios_1 = __importDefault(require("axios"));
const debug_1 = __importDefault(require("debug"));
const json_rpc_2_0_1 = require("json-rpc-2.0");
const log = (0, debug_1.default)('zion:rpc_client');
// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const makeJsonRpcClient = (url, controller) => {
    log('makeJsonRpcClient', url);
    const client = new json_rpc_2_0_1.JSONRPCClient(async (jsonRPCRequest) => {
        // log(
        //   'Sending JSON-RPC request:\n',
        //   inspect(jsonRPCRequest, { depth: null, colors: true, compact: false }),
        // )
        log('Sending JSON-RPC request:');
        log(jsonRPCRequest);
        const response = await axios_1.default.post(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(jsonRPCRequest),
            signal: controller?.signal,
        });
        log('Received JSON-RPC response:', response.status, response.data.constructor.name);
        log(response.data);
        if (response.status === 200) {
            client.receive(response.data);
        }
        else if (jsonRPCRequest.id !== undefined) {
            throw new Error(response.statusText);
        }
    });
    return client;
};
const makeZionRpcClient = (url) => {
    log('makeZionRpcClient', url);
    const abortController = new AbortController();
    abortController.signal.addEventListener('abort', () => {
        log('abortController aborted');
    });
    const rpcClient = makeJsonRpcClient(url ?? 'http://localhost/json-rpc', abortController); // TODO: remove test url
    const ss = {
        rpcClient,
        abortController,
    };
    Object.getOwnPropertyNames(core_1.ZionServicePrototype.prototype).forEach((prop) => {
        if (prop === 'constructor') {
            return;
        }
        const prev = ss[prop];
        ss[prop] = async (...a) => {
            //log('Calling', prop, ...a)
            return rpcClient.request('zion_' + prop, ...a);
        };
    });
    return ss;
};
exports.makeZionRpcClient = makeZionRpcClient;
