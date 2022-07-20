import { Visibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe("spaceHierarchy", () => {
  test("create a public space and a public room, have user join space and search for space childs", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);

    // bob creates a space
    const spaceId = await bob.createSpace({
      spaceName: "bob's space",
      visibility: Visibility.Public,
    });

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: Visibility.Public,
      parentSpaceId: spaceId,
    });

    const bob_spaceInfo = await bob.syncSpace(spaceId);
    expect(bob_spaceInfo.rooms.length).toEqual(2);

    // alice peeks the space // todo https://github.com/HereNotThere/harmony/issues/188
    // await alice.client.peekInRoom(spaceId.matrixRoomId);
    // expect alice to see info about the space

    // alice joins the space
    await alice.joinRoom(spaceId);

    // alice syncs the space
    const alice_spaceInfo = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo.rooms.length).toEqual(2);

    // can she join it?
    const alice_roomInfo = await alice.joinRoom(roomId);
    expect(alice_roomInfo.roomId).toEqual(roomId.matrixRoomId);
  });
  test("create a private space and a public room, have user join space and search for space childs", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);

    // bob creates a space
    const spaceId = await bob.createSpace({
      spaceName: "bob's private space",
      visibility: Visibility.Private,
    });

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: Visibility.Public,
      parentSpaceId: spaceId,
    });

    const bob_spaceInfo = await bob.syncSpace(spaceId);
    expect(bob_spaceInfo.rooms.length).toEqual(2);

    // alice syncs the space before getting an invite...
    const alice_spaceInfo_pre_join = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo_pre_join.rooms).toBeUndefined();

    // bob invites alice
    await bob.inviteUser(alice.matrixUserId!, spaceId);

    // alice joins the space
    await alice.joinRoom(spaceId);

    // alice syncs the space
    const alice_spaceInfo = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo.rooms.length).toEqual(2);

    // can she join it?
    const alice_roomInfo = await alice.joinRoom(roomId);
    expect(alice_roomInfo.roomId).toEqual(roomId.matrixRoomId);
  });
});

/* eslint-enable */
