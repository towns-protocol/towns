/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("userProfile", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test
  test("create users, update profile, create room, join, update profile", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob sets user name and profile photo
    await bob.client.setDisplayName("Bob's your uncle");
    await bob.client.setAvatarUrl("https://example.com/bob.png");
    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: RoomVisibility.Public,
    });
    // alice joins the room
    await alice.joinRoom(roomId);
    // alice should see bob's user name
    expect(
      await alice.eventually(
        (x) =>
          x.client.getRoom(roomId.matrixRoomId)?.getMember(bob.matrixUserId!)
            ?.name === "Bob's your uncle",
      ),
    ).toBe(true);
    // alice should see bob's profile photo
    expect(
      await alice.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.getMember(bob.matrixUserId!)
            ?.getMxcAvatarUrl() === "https://example.com/bob.png",
      ),
    ).toBe(true);
    // log alice's view of bob
    const alicesViewOfBob = alice.client
      .getRoom(roomId.matrixRoomId)
      ?.getMember(bob.matrixUserId!);
    console.log("alice sees bob as", {
      name: alicesViewOfBob?.name,
      disambiguate: alicesViewOfBob?.disambiguate,
      rawDisplayName: alicesViewOfBob?.rawDisplayName,
      avatarUrl: alicesViewOfBob?.getMxcAvatarUrl(),
    });
    // log bob's view of alice
    const bobsViewOfAlice = bob.client
      .getRoom(roomId.matrixRoomId)
      ?.getMember(alice.matrixUserId!);
    console.log("bob sees alice as", {
      name: bobsViewOfAlice?.name,
      disambiguate: bobsViewOfAlice?.disambiguate,
      rawDisplayName: bobsViewOfAlice?.rawDisplayName,
      avatarUrl: bobsViewOfAlice?.getMxcAvatarUrl(),
    });
    // alice updates her profile
    await alice.client.setDisplayName("Alice's your aunt");
    await alice.client.setAvatarUrl("https://example.com/alice.png");
    // bob should see alices new user name
    expect(
      await bob.eventually(
        (x) =>
          x.client.getRoom(roomId.matrixRoomId)?.getMember(alice.matrixUserId!)
            ?.name === "Alice's your aunt",
      ),
    ).toBe(true);
    // alice should see bob's profile photo
    expect(
      await bob.eventually(
        (x) =>
          x.client
            .getRoom(roomId.matrixRoomId)
            ?.getMember(alice.matrixUserId!)
            ?.getMxcAvatarUrl() === "https://example.com/alice.png",
      ),
    ).toBe(true);
    // send a message
    await bob.sendMessage(roomId, "hello");
    // alice should see the message
    expect(
      await alice.eventually((x) =>
        x.client
          .getRoom(roomId.matrixRoomId)
          ?.getLiveTimeline()
          .getEvents()
          .some((event: MatrixEvent) => event.getContent()?.body === "hello"),
      ),
    ).toBe(true);
    // get the message
    const message = alice.client
      .getRoom(roomId.matrixRoomId)
      ?.getLiveTimeline()
      .getEvents()
      .find((event: MatrixEvent) => event.getContent()?.body === "hello");

    // sender?
    expect(message?.sender?.rawDisplayName).toBe("Bob's your uncle");
  }); // end test
}); // end describe
