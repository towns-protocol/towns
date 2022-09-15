/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useState } from "react";
import {
  ISyncResponse,
  ClientEvent,
  NotificationCountType,
  IJoinedRoom,
  IRooms,
} from "matrix-js-sdk";
import { ISyncStateData, SyncState } from "matrix-js-sdk/lib/sync";
import { ZionClient } from "../../client/ZionClient";
import { IUnreadNotificationCounts } from "client/store/CustomMatrixStore";

export function useNotificationCounts(client: ZionClient | undefined) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (!client) {
      return;
    }
    console.log("USE UNREAD COUNTS EFFECT::init");

    const handleCounts = (
      debugString: string,
      setCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    ) => {
      return (channelId: string, count: number) => {
        setCounts((prev) => {
          if (prev[channelId] === count) {
            return prev;
          }
          // console.log("!!updating count", debugString, channelId, count);
          return {
            ...prev,
            [channelId]: count,
          };
        });
      };
    };

    const handleUnreadCounts = handleCounts("unread", setUnreadCounts);
    const handleMentionCounts = handleCounts("highlight", setMentionCounts);

    const handleSyncEvent = (
      unreadNotificationsMap?: Record<string, IUnreadNotificationCounts>,
    ) => {
      if (!unreadNotificationsMap) {
        return;
      }
      // console.log("!!!sync event", unreadNotificationsMap);
      Object.entries(unreadNotificationsMap).forEach(
        ([roomId, unread_notifications]) => {
          if (unread_notifications.notification_count !== undefined) {
            handleUnreadCounts(roomId, unread_notifications.notification_count);
          }
          if (unread_notifications.highlight_count !== undefined) {
            handleMentionCounts(roomId, unread_notifications.highlight_count);
          }
        },
      );
    };

    // backfill
    client.getRooms().forEach((room) => {
      const unreadCount = room.getUnreadNotificationCount(
        NotificationCountType.Total,
      );
      const highlightCount = room.getUnreadNotificationCount(
        NotificationCountType.Highlight,
      );
      if (unreadCount) {
        handleUnreadCounts(room.roomId, unreadCount);
      }
      if (highlightCount) {
        handleMentionCounts(room.roomId, highlightCount);
      }
    });
    // caputre first sync
    handleSyncEvent(client.store.getLastUnreadNotificationCounts());

    // listen for sync events
    const onSync = (
      state: SyncState,
      lastState?: SyncState,
      data?: ISyncStateData,
    ) => {
      // console.log("!!!sync event", state);
      // grab the last sync data from the store
      if (state === SyncState.Syncing) {
        handleSyncEvent(client.store.getLastUnreadNotificationCounts());
      }
    };

    client.on(ClientEvent.Sync, onSync);
    return () => {
      client.removeListener(ClientEvent.Sync, onSync);
    };
  }, [client]);

  return { mentionCounts, unreadCounts };
}
