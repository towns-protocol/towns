import { MatrixEvent } from "matrix-js-sdk";
import { MatrixTestClient } from "./helpers/MatrixTestClient";
import { Visibility } from "../../src/types/matrix-types";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe("sendAMessage", () => {
  test("create room, invite user, accept invite, and send message", async () => {
    const homeServer = "http://localhost:8008";
    // create clients
    const clients = [
      new MatrixTestClient("bob", homeServer),
      new MatrixTestClient("alice", homeServer),
    ];

    // assign clients to local variables
    const bob = clients[0];
    const alice = clients[1];

    // start them up
    await Promise.all(clients.map((client) => client.startClient()));

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: Visibility.Private,
    });

    // bob invites alice to the room
    await bob.inviteUser(alice.matrixUserId!, roomId);

    // alice should expect an invite to the room
    expect(
      await alice.eventually((x) => x.client.getRoom(roomId) != undefined),
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
            .getRoom(roomId)
            ?.timeline.find(
              (event: MatrixEvent) =>
                event.event.content?.body === "Hello Alice!",
            ) != undefined,
      ),
    ).toBe(true);

    // stop clients
    clients.map((client) => client.stopClient());
  });
});

/* eslint-enable */
