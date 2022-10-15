/// <reference types="node" />
import { ZionServiceInterface } from '@zion/core';
import { Wallet } from 'ethers';
import { JSONRPCServer } from 'json-rpc-2.0';
import { ZionServer } from './server';
export declare const makeJSONRPCServer: (zionServer: ZionServiceInterface) => JSONRPCServer;
export declare const makeExpressApp: (server: JSONRPCServer) => import("express-serve-static-core").Express;
export declare const startZionApp: (port: number) => {
    wallet: Wallet;
    express: import("express-serve-static-core").Express;
    appServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    zionServer: ZionServer;
    url: string;
    stop: () => Promise<void>;
};
export declare type ZionApp = ReturnType<typeof startZionApp>;
//# sourceMappingURL=app.d.ts.map