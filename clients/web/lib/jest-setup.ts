/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
import { request as matrixRequest } from "matrix-js-sdk";
import { ZionTestClient } from "./tests/integration/helpers/ZionTestClient";
import { webcrypto } from "node:crypto";
import * as Olm from "olm";
import * as request from "request";
import { Config, configure } from "@testing-library/dom";

process.env.HOMESERVER = "http://localhost:8008"; // OR "https://node1.hntlabs.com";
process.env.DISABLE_ENCRYPTION = "false";
process.env.ETHERS_NETWORK = "http://localhost:8545"; // OR "rinkeby"
process.env.FUNDED_WALLET_PRIVATE_KEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // we need a wallet with assets to fund our test clients
process.env.SPACE_MANAGER_ADDRESS =
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
process.env.TOKEN_ENTITLEMENT_ADDRESS =
  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
process.env.USER_ENTITLEMENT_ADDRESS =
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
process.env.COUNCIL_NFT_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
process.env.COUNCIL_STAKING_ADDRESS = "";

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
