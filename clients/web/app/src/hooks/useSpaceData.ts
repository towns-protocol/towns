import { useMemo } from "react";
import {
  Membership,
  Room,
  Space,
  SpaceChild,
  useMatrixStore,
  useSpace,
} from "use-matrix-client";
import { SpaceData, fakeSpaces } from "data/SpaceData";
import { Channel, ChannelGroup } from "data/ChannelData";
import { InviteData } from "data/InviteData";

export const useSpaceData = (slug: string | undefined) => {
  const zionSpace = useSpace(slug);
  return useMemo(
    () =>
      zionSpace
        ? formatSpace(zionSpace)
        : fakeSpaces.find((s) => s.id.slug === slug),
    [slug, zionSpace],
  );
};

export const useSpaces = () => {
  const { rooms } = useMatrixStore();
  return useMemo(
    () =>
      Object.values(rooms ?? [])
        .filter((r) => r.isSpaceRoom && r.membership === Membership.Join)
        .map((r) => formatRoom(r, "/placeholders/nft_29.png")),
    [rooms],
  );
};

export const useInvites = () => {
  const { rooms } = useMatrixStore();
  return useMemo(
    () =>
      Object.values(rooms ?? [])
        .filter((r) => r.membership === Membership.Invite)
        .map((r) => formatInvite(r, "/placeholders/nft_4.png")),
    [rooms],
  );
};

export const useInviteData = (slug: string | undefined) => {
  const { rooms } = useMatrixStore();
  const room = useMemo(
    () => (rooms && slug ? rooms[slug] : undefined),
    [rooms, slug],
  );
  return useMemo(
    () => (room ? formatInvite(room, "/placeholder/nft_4.png") : undefined),
    [room],
  );
};

/// formatting helper for changing a room join to a space
function formatSpace(r: Space): SpaceData {
  return formatRoom(r, "/placeholders/nft_29.png", toChannelGroups(r.children));
}

/// formatting helper for changing a room to a space
function formatRoom(
  r: Space | Room,
  avatarSrc: string,
  channelGroups: ChannelGroup[] = [],
): SpaceData {
  return {
    id: r.id,
    name: r.name,
    avatarSrc: avatarSrc,
    pinned: false,
    channelGroups: channelGroups,
  };
}

function formatInvite(r: Room, avatarSrc: string): InviteData {
  return {
    id: r.id,
    name: r.name,
    avatarSrc: avatarSrc,
    isSpaceRoom: r.isSpaceRoom,
  };
}

function formatChannel(spaceChild: SpaceChild): Channel {
  return {
    id: spaceChild.id,
    label: spaceChild.name ?? "",
    private: !spaceChild.worldReadable,
    highlight: false,
  };
}

function toChannelGroup(label: string, channels: SpaceChild[]): ChannelGroup {
  return {
    label: label,
    channels: channels.map(formatChannel),
  };
}

function toChannelGroups(children: SpaceChild[]): ChannelGroup[] {
  if (children.length === 0) {
    return [];
  }
  // the backend doesn't yet support tags, just return all channels in the general group
  return [toChannelGroup("General", children)];
}
