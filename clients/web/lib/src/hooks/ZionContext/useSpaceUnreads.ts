import { useEffect, useState } from "react";
import { ZionClient } from "../../client/ZionClient";
import { SpaceHierarchies } from "types/matrix-types";

export function useSpaceUnreads(
  client: ZionClient | undefined,
  spaceIds: string[],
  spaceHierarchies: SpaceHierarchies,
  unreadCounts: Record<string, number>,
  bShowSpaceRootUnreads: boolean,
): { spaceUnreads: Record<string, boolean> } {
  const [spaceUnreads, setSpaceUnreads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!client) {
      return;
    }
    // gets run every time spaceIds changes
    // console.log("USE SPACE UNREADS::running effect");
    const updateSpaceUnreads = (spaceId: string, hasUnread: boolean) => {
      setSpaceUnreads((prev) => {
        if (prev[spaceId] === hasUnread) {
          // console.log("!!!! ignoring space unread", spaceId, hasUnread);
          return prev;
        }
        // console.log("!!!! updating space unread", spaceId, hasUnread);
        return {
          ...prev,
          [spaceId]: hasUnread,
        };
      });
    };

    spaceIds.forEach((spaceId) => {
      const space = client.getRoom(spaceId);
      if (!space) {
        return;
      }
      const spaceHasUnread = bShowSpaceRootUnreads
        ? (unreadCounts[spaceId] ?? 0) > 0
        : false;
      const childIds =
        spaceHierarchies[spaceId]?.children.map((x) => x.id.matrixRoomId) ?? [];
      const hasUnread =
        spaceHasUnread ||
        childIds.find((id) => {
          return (unreadCounts[id] ?? 0) > 0;
        }) != undefined;
      // console.log("!!!! space has unread", spaceId, hasUnread);
      updateSpaceUnreads(spaceId, hasUnread);
    });
  }, [client, spaceIds, spaceHierarchies, unreadCounts, bShowSpaceRootUnreads]);

  return { spaceUnreads };
}
