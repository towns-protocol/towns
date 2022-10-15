import { FullEvent, Payload, ZionServiceInterface } from '@zion/core';
import { Wallet } from 'ethers';
import { ZionApp } from '../app';
export declare const makeEvent_test: (wallet: Wallet, payload: Payload, prevEvents: string[]) => FullEvent;
export declare type TestParams = [string, () => ZionServiceInterface][];
export declare const makeTestParams: (zionApp: () => ZionApp) => TestParams;
//# sourceMappingURL=util.test.d.ts.map