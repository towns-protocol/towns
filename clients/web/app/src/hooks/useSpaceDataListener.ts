import {
  Membership,
  Room,
  SpaceChild,
  useMatrixStore,
} from "use-matrix-client";
import { useEffect } from "react";
import { SpaceData, fakeSpaces } from "data/SpaceData";
import { useSpaceDataStore } from "store/spaceDataStore";
import { Channel, ChannelGroup } from "data/ChannelData";

/// formatting helper for changing a room to a space
const formatRoom = (
  r: Room,
  avatarSrc: string,
  channelGroups: ChannelGroup[] = [],
): SpaceData => {
  return {
    id: r.roomId,
    name: r.name,
    avatarSrc: avatarSrc,
    pinned: false,
    channelGroups: channelGroups,
  };
};

const formatChannel = (spaceChild: SpaceChild): Channel => {
  return {
    id: spaceChild.roomId,
    label: spaceChild.name ?? "",
    private: !spaceChild.worldReadable,
    highlight: false,
  };
};

const toChannelGroup = (
  label: string,
  channels: SpaceChild[],
): ChannelGroup => {
  return {
    label: label,
    channels: channels.map(formatChannel),
  };
};

const toChannelGroups = (children: SpaceChild[]): ChannelGroup[] => {
  if (children.length === 0) {
    return [];
  }
  // the backend doesn't yet support tags, just return all channels in the general group
  return [toChannelGroup("General", children)];
};

/// formatting helper for changing a room invite to a space
const formatInvite = (r: Room): SpaceData =>
  formatRoom(r, "/placeholders/nft_4.png");

/// formatting helper for changing a room join to a space
const formatSpace = (r: Room, children: SpaceChild[]): SpaceData =>
  formatRoom(r, "/placeholders/nft_29.png", toChannelGroups(children));

export const useSpaceDataListener = () => {
  const { rooms, spaces } = useMatrixStore();
  const { setSpaces, setInvites } = useSpaceDataStore();

  useEffect(() => {
    let invites: SpaceData[] = [];
    let spaceRoots: SpaceData[] = [];
    if (rooms) {
      // find the spaces
      spaceRoots = Object.values(rooms)
        .filter((r) => r.isSpaceRoom && r.membership === Membership.Join)
        .map((r) => formatSpace(r, spaces[r.roomId]?.children ?? []));
      // find the invites
      invites = Object.values(rooms)
        .filter((r) => r.membership === Membership.Invite)
        .map(formatInvite);
    }
    // for debugging stick some fake spaceRoots on the end!
    spaceRoots = spaceRoots.concat(fakeSpaces);

    setSpaces(spaceRoots);
    setInvites(invites);
  }, [rooms, spaces, setSpaces, setInvites]);
};
