import { createClient } from "matrix-js-sdk";
import { ZionAuth, ZionOpts } from "../ZionClientTypes";

export function createMatrixClient(opts: ZionOpts, auth?: ZionAuth) {
  if (auth) {
    return createClient({
      baseUrl: opts.homeServerUrl,
      accessToken: auth.accessToken,
      userId: auth.userId,
      deviceId: auth.deviceId,
    });
  } else {
    return createClient({ baseUrl: opts.homeServerUrl });
  }
}
