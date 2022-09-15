import { createClient, MatrixClient } from "matrix-js-sdk";
import { IStore } from "matrix-js-sdk/lib/store";
import { CustomMemoryStore } from "../store/CustomMatrixStore";
import { ZionAuth, ZionOpts } from "../ZionClientTypes";

export function createMatrixClient(
  opts: ZionOpts,
  auth?: ZionAuth,
): { store: CustomMemoryStore; client: MatrixClient } {
  const store = new CustomMemoryStore();
  if (auth) {
    return {
      store: store,
      client: createClient({
        store: store as IStore,
        baseUrl: opts.homeServerUrl,
        accessToken: auth.accessToken,
        userId: auth.userId,
        deviceId: auth.deviceId,
      }),
    };
  } else {
    return {
      store: store,
      client: createClient({ baseUrl: opts.homeServerUrl }),
    };
  }
}
