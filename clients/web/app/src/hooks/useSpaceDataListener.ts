import { useEffect } from "react";
import { useSpaceDataStore } from "store/spaceDataStore";
import {
  Membership,
  Room,
  SpaceChild,
  useMatrixStore,
} from "use-matrix-client";
import { SpaceData } from "data/SpaceData";
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
  const store = useMatrixStore();
  const { rooms, spaces } = store;

  const { setSpaces, setInvites } = useSpaceDataStore();
  console.log(store);
  useEffect(() => {
    let invites: SpaceData[] = [];
    let spaceRoots: SpaceData[] = [];
    if (rooms) {
      console.log(">>>", rooms, spaces);

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
    // spaceRoots = spaceRoots.concat(fakeSpaces);
    console.log(spaceRoots);
    setSpaces(spaceRoots);
    setInvites(invites);
  }, [rooms, spaces, setSpaces, setInvites]);
};
