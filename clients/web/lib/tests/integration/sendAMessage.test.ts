/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("sendAMessage", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test: sendAMessage
  test("create room, invite user, accept invite, and send message", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: RoomVisibility.Private,
    });
    // bob invites alice to the room
    await bob.inviteUser(alice.matrixUserId!, roomId);
    // alice should expect an invite to the room
    expect(
      await alice.eventually(
        (x) => x.client.getRoom(roomId.matrixRoomId) != undefined,
      ),
    ).toBe(true);
    // alice joins the room
    await alice.joinRoom(roomId);
    // bob sends a message to the room
    await bob.sendMessage(roomId, "Hello Alice!");
    // alice should receive the message
    expect(
      await alice.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.getLiveTimeline()
            .getEvents()
            .find(
              (event: MatrixEvent) =>
                event.getContent()?.body === "Hello Alice!",
            ) != undefined,
      ),
    ).toBe(true);
    // alice sends a message to the room
    await alice.sendMessage(roomId, "Hello Bob!");
    // bob should receive the message
    expect(
      await bob.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.getLiveTimeline()
            .getEvents()
            .find(
              (event: MatrixEvent) => event.getContent()?.body === "Hello Bob!",
            ) != undefined,
      ),
    ).toBe(true);
  });
});
