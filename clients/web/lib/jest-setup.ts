/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
import { request as matrixRequest } from "matrix-js-sdk";
import { ZionTestClient } from "./tests/integration/helpers/ZionTestClient";
import { webcrypto } from "node:crypto";
import * as Olm from "olm";
import * as request from "request";
import { configure } from "@testing-library/dom";

process.env.HOMESERVER = "http://localhost:8008"; // OR "https://node1.zion.xyz";
process.env.DISABLE_ENCRYPTION = "false";
process.env.ETHERS_NETWORK = "http://localhost:8545"; // OR "rinkeby"
process.env.FUNDED_WALLET_PRIVATE_KEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // we need a wallet with assets to fund our test clients

// This is here to extend the globalThis interface for loading Olm, should be in global.d.ts but
// that wasn't working
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface globalThis {
  Olm: typeof import("olm");
}

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = webcrypto;
  globalThis.Olm = Olm;
  await globalThis.Olm.init();
  // dom testing library config for `waitFor(...)`
  configure({
    asyncUtilTimeout: 5000, // default is 1000
  });
  // set up required global for the matrix client to allow us to make http requests
  matrixRequest(request);
});

afterEach(() => {
  // stop all test clients
  return ZionTestClient.cleanup();
}, 5000);
