/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("messageThreads", () => {
  jest.setTimeout(20000);
  test("send a threaded message", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a public room
    const roomId = await bob.createSpace({
      name: "bob's room",
      visibility: RoomVisibility.Public,
    });
    // alice joins the room
    await alice.joinRoom(roomId);
    // alice sends a wenmoon message
    await alice.sendMessage(roomId, "hi Bob!");
    // bob should receive the message
    await waitFor(() =>
      expect(
        bob
          .getRoom(roomId)
          ?.timeline.find(
            (event: MatrixEvent) => event.event.content?.body === "hi Bob!",
          ),
      ).toBeDefined(),
    );

    // get the message id
    const messageId = bob
      .getRoom(roomId)!
      .timeline.find(
        (event: MatrixEvent) => event.event.content?.body === "hi Bob!",
      )!.event.event_id;
    // bob sends a threaded message
    await bob.sendMessage(roomId, "hi Alice!", { threadId: messageId });
    // alice should receive the message
    await waitFor(() =>
      expect(
        alice
          .getRoom(roomId)
          ?.timeline.find(
            (event: MatrixEvent) =>
              event.event.content &&
              event.event.content["m.relates_to"]?.event_id === messageId,
          ),
      ).toBeDefined(),
    );
  }); // end test - send a threaded message
}); // end describe
