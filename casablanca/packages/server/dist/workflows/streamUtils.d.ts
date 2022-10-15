import { FullEvent, JoinStreamPayload, PayloadKind, StreamKind, TypedFullEvent } from '@zion/core';
import { ZionServer } from '../server';
/**
 * @returns streamId
 */
export declare const checkStreamCreationParams: (server: ZionServer, events: FullEvent[], expectedStreamKind: StreamKind, expectedExtraEvent?: PayloadKind) => Promise<string>;
export declare const addJoinedEventToUserStream: (server: ZionServer, streamId: string, joinEvent: TypedFullEvent<JoinStreamPayload>) => Promise<void>;
//# sourceMappingURL=streamUtils.d.ts.map