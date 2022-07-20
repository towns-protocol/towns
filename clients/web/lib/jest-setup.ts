import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import { request } from "matrix-js-sdk";
import { MatrixTestClient } from "./tests/integration/helpers/MatrixTestClient";

process.env.HOMESERVER = "http://localhost:8008"; // "https://node1.hntlabs.com";
process.env.CHAIN_ID = "0x4"; // rinkby

beforeAll(() => {
  // set up required global for the matrix client to allow us to make http requests
  request(require("request")); // eslint-disable-line @typescript-eslint/no-var-requires
});

afterEach(() => {
  // stop all test clients
  return MatrixTestClient.cleanup();
}, 5000);
