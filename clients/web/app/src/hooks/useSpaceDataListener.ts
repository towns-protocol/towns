import { Membership, isRoom, useMatrixStore, Room } from "use-matrix-client";
import { useEffect } from "react";
import { fakeChannelGroups } from "data/ChannelData";
import { SpaceData, fakeSpaces } from "data/SpaceData";
import { useSpaceDataStore } from "store/spaceDataStore";

/// formatting helper for changing a room to a space
const formatRoom = (r: Room, avatarSrc: string): SpaceData => {
  return {
    id: r.roomId,
    name: r.name,
    avatarSrc: avatarSrc,
    pinned: false,
    channels: fakeChannelGroups,
  };
};

/// formatting helper for changing a room invite to a space
const formatInvite = (r: Room): SpaceData =>
  formatRoom(r, "/placeholders/nft_4.png");

/// formatting helper for changing a room join to a space
const formatSpace = (r: Room): SpaceData =>
  formatRoom(r, "/placeholders/nft_29.png");

export function useSpaceDataListener() {
  const { rooms } = useMatrixStore();
  const { setSpaces, setInvites } = useSpaceDataStore();

  useEffect(() => {
    let invites: SpaceData[] = [];
    let spaces: SpaceData[] = [];
    if (rooms) {
      // find the spaces
      spaces = Object.values(rooms)
        .filter((r) => r.membership === Membership.Join)
        .map(formatSpace);
      // find the invites
      invites = Object.values(rooms)
        .filter((r) => r.membership === Membership.Invite)
        .map(formatInvite);
    }
    // for debugging stick some fake spaces on the end!
    spaces = spaces.concat(fakeSpaces);

    setSpaces(spaces);
    setInvites(invites);
  }, [rooms, setSpaces, setInvites]);
}
