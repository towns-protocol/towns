import {
  BridgeContext,
  BridgeController,
  MatrixUser,
  PresenceEvent,
  ReadReceiptEvent,
  RemoteRoom,
  RemoteUser,
  Request,
  TypingEvent,
  WeakEvent,
} from "matrix-appservice-bridge";

const PrintTag = "[ZionBridgeController]";
export class ZionBridgeController implements BridgeController {
  public async onEvent(
    request: Request<WeakEvent>,
    context?: BridgeContext | undefined
  ): Promise<void> {
    const ev = request.getData();
    console.log(`${PrintTag} onEvent`, ev);
  }

  public async onEphemeralEvent(
    request: Request<TypingEvent | ReadReceiptEvent | PresenceEvent>
  ): Promise<void> {
    const ev = request.getData();
    console.log(`${PrintTag} onEphemeralEvent`, ev);
  }

  public async onUserQuery(matrixUser: MatrixUser): Promise<{
    name?: string | undefined;
    url?: string | undefined;
    remote?: RemoteUser | undefined;
  } | null | void> {
    console.log(`${PrintTag} onUserQuery`, matrixUser);
  }

  public async onAliasQuery(
    alias: string,
    aliasLocalpart: string
  ): Promise<{
    roomId?: string;
    creationOpts?: Record<string, unknown>;
    remote?: RemoteRoom;
  } | null | void> {
    console.log(`${PrintTag} onAliasQuery`, alias);
  }

  public onLog(text: string, isError: boolean): void {
    console.log(`${PrintTag} onLog`, { text, isError });
  }
}
