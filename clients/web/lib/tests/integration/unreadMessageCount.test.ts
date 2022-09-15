/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { ClientEvent } from "matrix-js-sdk";
import { IUnreadNotificationCounts } from "../../src/client/store/CustomMatrixStore";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("unreadMessageCount", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test:
  test("create room, invite user, accept invite, and send message, check unread counts", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a space
    const spaceId = await bob.createSpace({
      name: "bob's space",
      visibility: RoomVisibility.Private,
    });
    // and a channel
    const channel_1 = await bob.createChannel({
      name: "channel 1",
      parentSpaceId: spaceId,
      visibility: RoomVisibility.Private,
    });
    // and another channel
    const channel_2 = await bob.createChannel({
      name: "channel 2",
      parentSpaceId: spaceId,
      visibility: RoomVisibility.Private,
    });
    // log
    console.log("!!!sync room ids", {
      space: spaceId.matrixRoomId,
      channel_1: channel_1.matrixRoomId,
      channel_2: channel_2.matrixRoomId,
    });
    // set up some local data
    const alicesLastNotifications: Record<string, IUnreadNotificationCounts> =
      {};
    // add a listner
    alice.on(ClientEvent.Sync, () => {
      console.log("!!!sync", alice.store.lastSyncData);
      const newNotifications = alice.store.getLastUnreadNotificationCounts();
      if (newNotifications) {
        Object.entries(newNotifications).forEach(
          ([roomId, nots]) => (alicesLastNotifications[roomId] = nots),
        );
      }
    });
    // bob invites alice to the room
    await bob.inviteUser(spaceId, alice.matrixUserId!);
    await bob.inviteUser(channel_1, alice.matrixUserId!);
    await bob.inviteUser(channel_2, alice.matrixUserId!);
    // alice should see the room
    await waitFor(() => expect(alice.getRoom(spaceId)).toBeDefined());
    // initially we have 1 unread messages for space and each channel
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
    // alice joins the room
    await alice.joinRoom(spaceId);
    await alice.joinRoom(channel_1);
    await alice.joinRoom(channel_2);
    // expect our membership to be join
    await waitFor(() =>
      expect(alice.getRoom(spaceId)?.getMyMembership()).toBe("join"),
    );
    await waitFor(() =>
      expect(alice.getRoom(channel_1)?.getMyMembership()).toBe("join"),
    );
    await waitFor(() =>
      expect(alice.getRoom(channel_2)?.getMyMembership()).toBe("join"),
    );
    // bob sends a message to the room
    await bob.sendMessage(channel_1, "Hello Alice!");
    // check our counts
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[channel_1.matrixRoomId]?.notification_count,
      ).toBe(2),
    );
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[channel_2.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
    // start clearing the notifications
    await alice.sendReadReceipt(channel_1);
    // and see the update
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[channel_1.matrixRoomId]?.notification_count,
      ).toBe(0),
    );
    // clear
    await alice.sendReadReceipt(spaceId);
    // and see the update
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count,
      ).toBe(0),
    );
  }); // end test
}); // end describe
