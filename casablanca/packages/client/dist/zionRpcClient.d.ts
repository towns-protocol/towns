import { ZionServiceInterface } from '@zion/core';
import { JSONRPCClient } from 'json-rpc-2.0';
export declare type ZionRpcClient = ZionServiceInterface & {
    rpcClient: JSONRPCClient;
    abortController: AbortController;
};
export declare const makeZionRpcClient: (url?: string) => ZionRpcClient;
//# sourceMappingURL=zionRpcClient.d.ts.map