/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("spaceHierarchy", () => {
  test("create a public space and a public room, have user join space and search for space childs", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);

    // bob creates a space
    const spaceId = await bob.createSpace({
      spaceName: "bob's space",
      visibility: RoomVisibility.Public,
    });

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: RoomVisibility.Public,
      parentSpaceId: spaceId,
    });

    const bob_spaceInfo = await bob.syncSpace(spaceId);
    expect(bob_spaceInfo?.children.length).toEqual(1);

    // alice peeks the space // todo https://github.com/HereNotThere/harmony/issues/188
    // await alice.client.peekInRoom(spaceId.matrixRoomId);
    // expect alice to see info about the space

    // alice joins the space
    await alice.joinRoom(spaceId);

    // alice syncs the space
    const alice_spaceInfo = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo?.children.length).toEqual(1);

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
      visibility: RoomVisibility.Private,
    });

    // bob creates a room
    const roomId = await bob.createRoom({
      roomName: "bob's room",
      visibility: RoomVisibility.Public,
      parentSpaceId: spaceId,
    });

    const bob_spaceInfo = await bob.syncSpace(spaceId);
    expect(bob_spaceInfo?.children.length).toEqual(1);

    // alice syncs the space before getting an invite...
    const alice_spaceInfo_pre_join = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo_pre_join?.children).toBeUndefined();

    // bob invites alice
    await bob.inviteUser(alice.matrixUserId!, spaceId);

    // alice joins the space
    await alice.joinRoom(spaceId);

    // alice syncs the space
    const alice_spaceInfo = await alice.syncSpace(spaceId);
    expect(alice_spaceInfo?.children.length).toEqual(1);

    // can she join it?
    const alice_roomInfo = await alice.joinRoom(roomId);
    expect(alice_roomInfo.roomId).toEqual(roomId.matrixRoomId);
  });
});
