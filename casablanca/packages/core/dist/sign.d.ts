/// <reference types="node" />
import { Wallet } from 'ethers';
import { BaseEvent, EventRef, FullEvent, Payload } from './types';
export declare const hashEvent: (event: BaseEvent) => [string, Buffer];
export declare const makeEvent: (wallet: Wallet, payload: Payload, prevEvents: string[]) => FullEvent;
export declare const makeEvents: (wallet: Wallet, payloads: Payload[], prevEvents: string[]) => FullEvent[];
export declare const checkEvent: (event: FullEvent, prevEventHash: string | null) => void;
export declare const checkEvents: (event: FullEvent[]) => void;
export declare const makeEventRef: (streamId: string, event: FullEvent) => EventRef;
//# sourceMappingURL=sign.d.ts.map