import { FullEvent, StreamAndCookie, StreamEvents, StreamStateView, ZionServiceInterface } from '@zion/core';
import { Wallet } from 'ethers';
import TypedEmitter from 'typed-emitter';
declare const Stream_base: new () => TypedEmitter<StreamEvents>;
export declare class Stream extends Stream_base {
    readonly streamId: string;
    syncCookie?: string;
    readonly clientEmitter: TypedEmitter<StreamEvents>;
    rollup: StreamStateView;
    constructor(streamId: string, inceptionEvent: FullEvent | undefined, clientEmitter: TypedEmitter<StreamEvents>);
    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     * @param events
     * @param emitter
     */
    addEvents(streamAndCookie: StreamAndCookie, init?: boolean): void;
    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean;
}
declare const Client_base: new () => TypedEmitter<StreamEvents>;
export declare class Client extends Client_base {
    readonly wallet: Wallet;
    readonly rpcClient: ZionServiceInterface;
    userStreamId?: string;
    readonly streams: {
        [streamId: string]: Stream;
    };
    stopSyncResolve?: (value: string) => void;
    constructor(wallet: Wallet, rpcClient: ZionServiceInterface);
    get address(): string;
    stream(streamId: string): Stream;
    private initUserStream;
    createNewUser(): Promise<void>;
    loadExistingUser(): Promise<void>;
    createSpace(spaceId: string): Promise<void>;
    createChannel(channelId: string, spaceId: string): Promise<void>;
    private initStream;
    private onJoinedStream;
    private onLeftStream;
    startSync(timeoutMs?: number): Promise<void>;
    stopSync(): void;
    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean;
    sendMessage(streamId: string, text: string): Promise<void>;
}
export {};
//# sourceMappingURL=client.d.ts.map