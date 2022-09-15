/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { RoomVisibility } from "../../src/types/matrix-types";
import { ZTEvent } from "../../src/types/timeline-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("sendReaction", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test:
  test("create room, invite user, accept invite, send message, send a reaction", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a room
    const roomId = await bob.createSpace({
      name: "bob's room",
      visibility: RoomVisibility.Public,
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
    // grab the event
    const event = alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1);
    // alice sends a reaction to the message
    await alice.sendReaction(roomId, event!.getId(), "👍");
    // bob should receive the message
    await waitFor(() =>
      expect(
        bob.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getType(),
      ).toBe(ZTEvent.Reaction),
    );
  }); // end test
}); // end describe
