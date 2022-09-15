/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("sendAMessage", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test:
  test("create room, invite user, accept invite, and send message", async () => {
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
          .find(
            (event: MatrixEvent) => event.getContent()?.body === "Hello Alice!",
          ),
      ).toBeDefined(),
    );
    // alice sends a message to the room
    await alice.sendMessage(roomId, "Hello Bob!");
    // bob should receive the message
    await waitFor(() =>
      expect(
        bob
          .getRoom(roomId)
          ?.getLiveTimeline()
          .getEvents()
          .find(
            (event: MatrixEvent) => event.getContent()?.body === "Hello Bob!",
          ),
      ).toBeDefined(),
    );
  }); // end test
}); // end describe
