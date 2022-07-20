import { MatrixEvent } from "matrix-js-sdk";
import { Visibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe("sendAMessage", () => {
  test("create room, invite user, accept invite, and send message", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: Visibility.Private,
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

    // bob sends a message to alice
    await bob.sendMessage(roomId, "Hello Alice!");

    // alice should receive the message
    expect(
      await alice.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.timeline.find(
              (event: MatrixEvent) =>
                event.event.content?.body === "Hello Alice!",
            ) != undefined,
      ),
    ).toBe(true);

    await alice.sendMessage(roomId, "Hello Bob!");

    // alice should receive the message
    expect(
      await bob.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.timeline.find(
              (event: MatrixEvent) =>
                event.event.content?.body === "Hello Bob!",
            ) != undefined,
      ),
    ).toBe(true);
  });
});

/* eslint-enable */
