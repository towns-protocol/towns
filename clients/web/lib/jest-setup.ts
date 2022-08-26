import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
import { request as matrixRequest } from "matrix-js-sdk";
import { ZionTestClient } from "./tests/integration/helpers/ZionTestClient";
import { webcrypto } from "node:crypto";
import * as Olm from "olm";
import * as request from "request";
import { Config, configure } from "@testing-library/dom";

process.env.HOMESERVER = "http://localhost:8008"; // OR "https://node1.hntlabs.com";
process.env.CHAIN_ID = "0x539"; // localhost,  OR "0x4"; // rinkby
process.env.DISABLE_ENCRYPTION = "false";
process.env.ETHERS_NETWORK = "http://localhost:8545"; // OR "rinkeby"
process.env.FUNDED_WALLET_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // we need a wallet with assets to fund our test clients
process.env.SPACE_MANAGER_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.USER_MODULE_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
process.env.COUNCIL_NFT_ADDRESS = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
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
  // set up the matrix config func
  configure((config: Config) => {
    // this is necessary for the full test suite to pass, but when it's enabled
    // the waitUntil tests don't print nice html state on failure, making it hard to debug
    // leaving it disabled for now
    // config.asyncUtilTimeout = 10000;
    return config;
  });
  // set up required global for the matrix client to allow us to make http requests
  matrixRequest(request);
});

afterEach(() => {
  // stop all test clients
  return ZionTestClient.cleanup();
}, 5000);
