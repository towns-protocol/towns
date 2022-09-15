/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("sendThreadedMessage", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test: sendAMessage
  test("create room, invite user, accept invite, and send threadded message", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a room
    const roomId = await bob.createSpace({
      name: "bob's room",
      visibility: RoomVisibility.Private,
    });
    // bob invites alice to the room
    await bob.inviteUser(roomId, alice.matrixUserId!);
    // alice should expect an invite to the room
    await waitFor(() => expect(alice.getRoom(roomId)).toBeDefined());
    // alice joins the room
    await alice.joinRoom(roomId);
    // bob sends a message to the room
    await bob.sendMessage(roomId, "Hello Alice!");
    // alice should receive the message
    await waitFor(() =>
      expect(
        alice
          .getRoom(roomId)
          ?.getLiveTimeline()
          .getEvents()
          .at(-1)
          ?.getContent().body,
      ).toBe("Hello Alice!"),
    );
    // event
    const event = alice
      .getRoom(roomId)!
      .getLiveTimeline()
      .getEvents()
      .find((e) => e.getContent()?.body === "Hello Alice!")!;
    // assert assumptions
    expect(event.threadRootId).toBeUndefined();
    // alice sends a threaded reply room
    await alice.sendMessage(roomId, "Hello Bob!", { threadId: event.getId() });
    // bob should receive the message
    await waitFor(() =>
      expect(
        bob.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
          .body,
      ).toBe("Hello Bob!"),
    );
    // the event should have a threadId
    const threadedEvent = bob
      .getRoom(roomId)!
      .getLiveTimeline()
      .getEvents()
      .find((event: MatrixEvent) => event.getContent()?.body === "Hello Bob!")!;
    // the threadId should be the eventId of the original message
    expect(threadedEvent.threadRootId).toBe(event.getId());
  }); // end test
}); // end describe
