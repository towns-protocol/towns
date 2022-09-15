/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("messageScrollback", () => {
  jest.setTimeout(20000);
  test("make sure we can scrollback", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a public room
    const roomId = await bob.createSpace({
      name: "bob's room",
      visibility: RoomVisibility.Public,
    });
    // send 25 messages (20 is our default initialSyncLimit)
    for (let i = 0; i < 25; i++) {
      await bob.sendMessage(roomId, `message ${i}`);
    }
    // alice joins the room
    await alice.joinRoom(roomId);
    //
    // alice should receive 20 messages message
    //
    await waitFor(() =>
      expect(alice.getRoom(roomId)?.getLiveTimeline().getEvents().length).toBe(
        20,
      ),
    );
    // call scrollback
    await alice.scrollback(roomId, 30);
    // did we get more events?
    await waitFor(() =>
      expect(
        alice.getRoom(roomId)?.getLiveTimeline().getEvents().length,
      ).toBeGreaterThan(20),
    );
  }); // end test - send a threaded message
}); // end describe
