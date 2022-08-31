import { useMemo } from "react";
import {
  Channel,
  ChannelGroup,
  InviteData,
  makeRoomIdentifierFromSlug,
  Membership,
  Room,
  RoomIdentifier,
  SpaceChild,
  SpaceData,
  SpaceHierarchy,
} from "../types/matrix-types";
import { useMatrixStore } from "../store/use-matrix-store";
import { useZionClient } from "./use-zion-client";
import { useRoom } from "./use-room";
import { useSpaces } from "./use-spaces";
import { useZionContext } from "../components/ZionContextProvider";
import { useSpaceContext } from "../components/SpaceContextProvider";

/// returns default space if no space slug is provided
export function useSpaceData(): SpaceData | undefined {
  const { defaultSpaceId, defaultSpaceAvatarSrc, defaultSpaceName } =
    useZionContext();
  const { spaceId } = useSpaceContext();
  const { spaceHierarchies } = useMatrixStore();
  const { clientRunning } = useZionClient();
  const spaceRoom = useRoom(spaceId);
  const spaceHierarchy = useMemo(
    () => (spaceId?.slug ? spaceHierarchies[spaceId.slug] : undefined),
    [spaceId?.slug, spaceHierarchies],
  );

  return useMemo(() => {
    if (spaceRoom || spaceHierarchy) {
      return formatSpace(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        spaceRoom ?? spaceHierarchy!.root,
        spaceHierarchy,
        spaceRoom?.membership ?? "",
        "/placeholders/nft_29.png",
      );
    } else if (
      clientRunning &&
      defaultSpaceId &&
      spaceId?.matrixRoomId == defaultSpaceId?.matrixRoomId
    ) {
      // this bit is temporary because client.peek(...) ("rooms_initial_sync") is unimplemented in dendrite https://github.com/HereNotThere/harmony/issues/188
      const defaultSpaceRoom: Room = {
        id: defaultSpaceId,
        name: defaultSpaceName ?? "Default Space",
        members: {},
        membership: "",
        isSpaceRoom: true,
      };
      return formatSpace(
        defaultSpaceRoom,
        undefined,
        defaultSpaceRoom.membership,
        defaultSpaceAvatarSrc ?? "/placeholders/nft_29.png",
      );
    }
    return undefined;
  }, [
    clientRunning,
    defaultSpaceAvatarSrc,
    defaultSpaceId,
    defaultSpaceName,
    spaceHierarchy,
    spaceRoom,
    spaceId,
  ]);
}

export const useInvites = () => {
  const { rooms } = useMatrixStore();
  const spaces = useSpaces();
  return useMemo(
    () =>
      Object.values(rooms ?? [])
        .filter((r) => r.membership === Membership.Invite)
        .map((r) =>
          formatInvite(
            r,
            getParentSpaceId(r.id, spaces),
            "/placeholders/nft_4.png",
          ),
        ),
    [rooms, spaces],
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useInvitesForSpace = (spaceId: RoomIdentifier) => {
  // todo this doesn't work yet
  return useInvites();
};

export const useInviteData = (slug: string | undefined) => {
  const { rooms } = useMatrixStore();
  const inviteId = slug ? makeRoomIdentifierFromSlug(slug) : undefined;
  const room = useMemo(
    () => (rooms && inviteId?.slug ? rooms[inviteId.slug] : undefined),
    [rooms, inviteId?.slug],
  );
  const spaces = useSpaces();
  const parentSpaceId = useMemo(
    () => getParentSpaceId(inviteId, spaces),
    [spaces, inviteId],
  );

  return useMemo(
    () =>
      room
        ? formatInvite(room, parentSpaceId, "/placeholder/nft_4.png")
        : undefined,
    [parentSpaceId, room],
  );
};

function getParentSpaceId(
  roomId: RoomIdentifier | undefined,
  spaces: SpaceData[],
): RoomIdentifier | undefined {
  const hasChannel = (channelGroup: ChannelGroup, id: RoomIdentifier) =>
    channelGroup.channels.some((c) => c.id.slug === id.slug);
  const hasChannelGroup = (space: SpaceData, id: RoomIdentifier) =>
    space.channelGroups.some((channelGroup) => hasChannel(channelGroup, id));
  const parentId = roomId
    ? spaces.find((space) => hasChannelGroup(space, roomId))?.id
    : undefined;
  return parentId;
}

/// formatting helper for changing a room join to a space
function formatSpace(
  root: Room | SpaceChild,
  spaceHierarchy: SpaceHierarchy | undefined,
  membership: string,
  avatarSrc: string,
): SpaceData {
  return formatRoom(
    root,
    membership,
    avatarSrc,
    toChannelGroups(spaceHierarchy?.children ?? []),
  );
}

/// formatting helper for changing a room to a space
export function formatRoom(
  r: Room | SpaceChild,
  membership: string,
  avatarSrc: string,
  channelGroups: ChannelGroup[] = [],
): SpaceData {
  return {
    id: r.id,
    name: r.name,
    avatarSrc: avatarSrc,
    pinned: false,
    channelGroups: channelGroups,
    membership: membership,
  };
}

function formatInvite(
  r: Room,
  spaceParentId: RoomIdentifier | undefined,
  avatarSrc: string,
): InviteData {
  return {
    id: r.id,
    name: r.name,
    avatarSrc: avatarSrc,
    isSpaceRoom: r.isSpaceRoom,
    spaceParentId: spaceParentId,
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
  // the backend doesn't yet support tags, just return all channels in the "Channels" group
  return [toChannelGroup("Channels", children)];
}
