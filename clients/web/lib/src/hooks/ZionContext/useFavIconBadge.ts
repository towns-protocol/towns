import { useEffect, useRef } from "react";
import {
  SpaceChild,
  SpaceHierarchies,
  SpaceHierarchy,
} from "../../types/matrix-types";
import { Badger } from "../../utils/Badger";

export function useFavIconBadge(
  unreadCounts: Record<string, number>,
  spaceHierarchies: SpaceHierarchies,
  invitedToIds: string[],
  bShowSpaceRootUnreads: boolean,
) {
  useEffect(() => {
    // calculate the new value
    const value =
      // all invites
      invitedToIds.length +
      // all unreads in the space hierarchy
      Object.values(spaceHierarchies).reduce(
        (p1: number, current: SpaceHierarchy) => {
          // optionally including the root
          const spaceRootUnreadCount = bShowSpaceRootUnreads
            ? unreadCounts[current.root.id.matrixRoomId] ?? 0
            : 0;
          // and all children
          const childUnreadCount = current.children.reduce(
            (p2: number, current: SpaceChild) =>
              p2 + (unreadCounts[current.id.matrixRoomId] ?? 0),
            0,
          );
          // add them up
          return p1 + spaceRootUnreadCount + childUnreadCount;
        },
        0,
      );
    // set the badge
    Badger.faviconSingleton().badge(value);
    // log
    console.log("calculated new badge value", value);
    // end: useEffect
  }, [unreadCounts, spaceHierarchies, invitedToIds, bShowSpaceRootUnreads]);
}
