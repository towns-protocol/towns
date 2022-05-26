import {
  BridgeContext,
  BridgeController,
  Logging,
  MatrixUser,
  PresenceEvent,
  ReadReceiptEvent,
  RemoteRoom,
  RemoteUser,
  Request,
  TypingEvent,
  WeakEvent,
} from "matrix-appservice-bridge";

import { LOGGER_NAME } from "./global-const";

const PrintTag = "[ZionBridgeController]";
const log = Logging.get(LOGGER_NAME);

export class ZionBridgeController implements BridgeController {
  public async onEvent(
    request: Request<WeakEvent>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: BridgeContext | undefined,
  ): Promise<void> {
    const ev = request.getData();
    log.info(`${PrintTag} onEvent`, ev);
  }

  public async onEphemeralEvent(
    request: Request<TypingEvent | ReadReceiptEvent | PresenceEvent>,
  ): Promise<void> {
    const ev = request.getData();
    log.info(`${PrintTag} onEphemeralEvent`, ev);
  }

  public async onUserQuery(matrixUser: MatrixUser): Promise<{
    name?: string | undefined;
    url?: string | undefined;
    remote?: RemoteUser | undefined;
  } | null | void> {
    log.info(`${PrintTag} onUserQuery`, matrixUser);
  }

  public async onAliasQuery(
    alias: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    aliasLocalpart: string,
  ): Promise<{
    roomId?: string;
    creationOpts?: Record<string, unknown>;
    remote?: RemoteRoom;
  } | null | void> {
    log.info(`${PrintTag} onAliasQuery`, alias);
  }

  public onLog(text: string, isError: boolean): void {
    log.info(`${PrintTag} onLog`, { text, isError });
  }
}
