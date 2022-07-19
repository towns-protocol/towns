import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import { request } from "matrix-js-sdk";
import { MatrixTestClient } from "./tests/integration/helpers/MatrixTestClient";

beforeAll(() => {
  // set up required global for the matrix client to allow us to make http requests
  request(require("request")); // eslint-disable-line @typescript-eslint/no-var-requires
});

afterEach(() => {
  // stop all test clients
  return MatrixTestClient.cleanup();
}, 5000);
