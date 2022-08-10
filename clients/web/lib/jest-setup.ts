import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
import { request as matrixRequest } from "matrix-js-sdk";
import { ZionTestClient } from "./tests/integration/helpers/ZionTestClient";
import { webcrypto } from "node:crypto";
import * as Olm from "olm";
import * as request from "request";
import { Config, configure } from "@testing-library/dom";

process.env.HOMESERVER = "http://localhost:8008"; //"https://node1.hntlabs.com";
process.env.CHAIN_ID = "0x539"; // localhost, "0x4"; // rinkby
process.env.DISABLE_ENCRYPTION = "false";

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
