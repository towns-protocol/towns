/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { render } from "@testing-library/react";
import { sleepUntil } from "../../src/utils/zion-utils";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("sendThreadedMessageHooks", () => {
  jest.setTimeout(60000);
  test("user can join a room, see messages, and send threaded messages", async () => {
    render(<></>);
    await sleepUntil(this, () => true);
    expect(true).toBe(true);
    // TODO
  });
});
