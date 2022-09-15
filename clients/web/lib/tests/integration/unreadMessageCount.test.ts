/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from "@testing-library/dom";
import { ClientEvent, MatrixEvent } from "matrix-js-sdk";
import { RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";

describe("unreadMessageCount", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test:
  test("create room, invite user, accept invite, and send message, check unread counts", async () => {
    // create clients
    const { bob, alice } = await registerAndStartClients(["bob", "alice"]);
    // bob creates a room
    const roomId = await bob.createSpace({
      name: "bob's room",
      visibility: RoomVisibility.Private,
    });
    // bob invites alice to the room
    await bob.inviteUser(roomId, alice.matrixUserId!);
    // alice should see the room
    await waitFor(() => expect(alice.getRoom(roomId)).toBeDefined());
    // grab the room
    const alicesRoomView = alice.getRoom(roomId)!;
    // set up some local data
    let alicesLastNotifications = alice.store.getLastUnreadNotificationCounts();
    // add a listner
    alice.on(ClientEvent.Sync, () => {
      alicesLastNotifications = alice.store.getLastUnreadNotificationCounts();
    });
    // initially we have 1 unread messages (the invite!)
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[roomId.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
    // alice joins the room
    await alice.joinRoom(roomId);
    // expect our membership to be join
    await waitFor(() => expect(alicesRoomView.getMyMembership()).toBe("join"));
    // we should clear the notification count
    await alice.sendReadReceipt(
      roomId,
      alicesRoomView.getLiveTimeline().getEvents().at(-1)!.getId(),
    );
    // and see the update
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[roomId.matrixRoomId]?.notification_count,
      ).toBe(0),
    );
    // bob sends a message to the room
    await bob.sendMessage(roomId, "Hello Alice!");
    // alice should receive the message
    await waitFor(() =>
      expect(
        alicesRoomView
          .getLiveTimeline()
          .getEvents()
          .find(
            (event: MatrixEvent) => event.getContent()?.body === "Hello Alice!",
          ),
      ).toBeDefined(),
    );
    // get the event
    const event = alicesRoomView
      .getLiveTimeline()
      .getEvents()
      .find(
        (event: MatrixEvent) => event.getContent()?.body === "Hello Alice!",
      )!;
    // alice should see 1 messages as unread
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[roomId.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
    //
    console.log("!!!! sending read receipt");
    // mark as read
    await alice.sendReadReceipt(roomId, event.getId());
    // alice should see 0 messages as unread
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[roomId.matrixRoomId]?.notification_count,
      ).toBe(0),
    );
    // bob sends a message to the room
    await bob.sendMessage(roomId, "Hello Again Alice!");
    await waitFor(() =>
      expect(
        alicesRoomView
          .getLiveTimeline()
          .getEvents()
          .find(
            (event: MatrixEvent) =>
              event.getContent()?.body === "Hello Again Alice!",
          ),
      ).toBeDefined(),
    );
    // alice should see 1 messages as unread
    await waitFor(() =>
      expect(
        alicesLastNotifications?.[roomId.matrixRoomId]?.notification_count,
      ).toBe(1),
    );
  }); // end test
}); // end describe
