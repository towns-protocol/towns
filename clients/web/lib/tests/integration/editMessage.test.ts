/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("editMessage", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test: sendAMessage
  test("create room, invite user, send message, edit message", async () => {
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
    expect(await alice.eventually((x) => x.getRoom(roomId))).toBeDefined();
    // alice joins the room
    await alice.joinRoom(roomId);
    // wait for bob to see the member event
    expect(
      await bob.eventually(
        (x) =>
          x.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
            .displayname,
      ),
    ).toEqual(alice.matrixUserId!.toLowerCase().replace("@", "").split(":")[0]);
    // bob sends a message to the room
    await bob.sendMessage(roomId, "Hello Balice!");
    // alice should receive the message
    expect(
      await alice.eventually(
        (x) =>
          x.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
            .body === "Hello Balice!",
      ),
    ).toBe(true);
    // bob wants to edit the message!
    const event = bob
      .getRoom(roomId)!
      .getLiveTimeline()
      .getEvents()
      .filter((x) => x.getType() === "m.room.message")
      .at(-1)!;
    // assert assumptions
    expect(event?.getContent().body).toEqual("Hello Balice!");
    // edit the message
    await bob.editMessage(roomId, "Hello Alice!", {
      originalEventId: event.getId(),
    });
    // bob should show the new message
    expect(
      await bob.eventually(
        (x) =>
          (x
            .getRoom(roomId)
            ?.getLiveTimeline()
            .getEvents()
            .filter((x) => x.getType() === "m.room.message")
            .at(-1)
            ?.getContent().body as string) === "Hello Alice!",
      ),
    ).toBe(true);
    // alice should see the new message
    expect(
      await alice.eventually(
        (x) =>
          (x
            .getRoom(roomId)
            ?.getLiveTimeline()
            .getEvents()
            .filter((x) => x.getType() === "m.room.message")
            .at(-1)
            ?.getContent().body as string) === "Hello Alice!",
      ),
    ).toBe(true);
  }); // end test
}); // end describe
