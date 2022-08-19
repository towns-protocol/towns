/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
    expect(
      await alice.eventually(
        (x) =>
          (x.getRoom(roomId)?.getLiveTimeline().getEvents().length ?? 0) == 20,
      ),
    ).toBe(true);
    // call scrollback
    await alice.scrollback(roomId, 30);
    // did we get more events?
    expect(
      await alice.eventually(
        (x) =>
          (x.getRoom(roomId)?.getLiveTimeline().getEvents().length ?? 0) > 20,
      ),
    ).toBe(true);
  }); // end test - send a threaded message
}); // end describe
