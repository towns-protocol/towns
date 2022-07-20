/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MatrixEvent } from "matrix-js-sdk";
import { Visibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("messageThreads", () => {
  test("send a threaded message", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a public room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: Visibility.Public,
    });
    // alice joins the room
    await alice.joinRoom(roomId);
    // alice sends a wenmoon message
    await alice.sendMessage(roomId, "hi Bob!");
    // bob should receive the message
    expect(
      await bob.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.timeline.find(
              (event: MatrixEvent) => event.event.content?.body === "hi Bob!",
            ) != undefined,
      ),
    ).toBe(true);
    // get the message id
    const messageId = bob.client
      .getRoom(roomId.matrixRoomId)!
      .timeline.find(
        (event: MatrixEvent) => event.event.content?.body === "hi Bob!",
      )!.event.event_id;
    // bob sends a threaded message
    await bob.sendMessage(roomId, "hi Alice!", { threadId: messageId });
    // alice should receive the message
    expect(
      await alice.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.timeline.find(
              (event: MatrixEvent) =>
                event.event.content &&
                event.event.content["m.relates_to"]?.event_id === messageId,
            ) != undefined,
      ),
    ).toBe(true);
  }); // end test - send a threaded message
}); // end describe
