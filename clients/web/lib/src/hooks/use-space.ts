import { useContext, useEffect, useMemo } from "react";
import {
  Channel,
  ChannelGroup,
  InviteData,
  makeRoomIdentifierFromSlug,
  Membership,
  Room,
  RoomIdentifier,
  Space,
  SpaceChild,
  SpaceData,
  ZionContext,
} from "../types/matrix-types";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixClient } from "./use-matrix-client";
import { useRoom } from "./use-room";
import { MatrixContext } from "../components/MatrixContextProvider";

/// returns default space if no space slug is provided
export function useSpace(
  slug: string | undefined = undefined,
): SpaceData | undefined {
  const { defaultSpaceId, defaultSpaceAvatarSrc, defaultSpaceName } =
    useContext<ZionContext>(MatrixContext);
  const { spaces } = useMatrixStore();
  const { clientRunning, syncSpace } = useMatrixClient();
  const spaceRoomId = slug ? makeRoomIdentifierFromSlug(slug) : defaultSpaceId;
  const spaceRoom = useRoom(spaceRoomId);
  useEffect(() => {
    void (async () => {
      try {
        if (clientRunning && spaceRoom?.id) {
          await syncSpace(spaceRoom?.id);
        }
      } catch (reason: unknown) {
        console.log("SpacesIndex error:", reason);
      }
    })();
  }, [clientRunning, spaceRoom?.id, syncSpace]);

  return useMemo(() => {
    if (spaceRoomId && spaces && spaces[spaceRoomId.slug]) {
      return formatSpace(spaces[spaceRoomId.slug], "/placeholders/nft_29.png");
    } else if (
      clientRunning &&
      defaultSpaceId &&
      spaceRoomId?.matrixRoomId == defaultSpaceId?.matrixRoomId
    ) {
      // this bit is temporary because client.peek(...) ("rooms_initial_sync") is unimplemented in dendrite https://github.com/HereNotThere/harmony/issues/188
      const defaultSpace: Space = {
        id: defaultSpaceId,
        name: defaultSpaceName ?? "Default Space",
        members: {},
        children: [],
        membership: "",
      };
      return formatSpace(
        defaultSpace,
        defaultSpaceAvatarSrc ?? "/placeholders/nft_29.png",
      );
    }
    return undefined;
  }, [
    clientRunning,
    defaultSpaceAvatarSrc,
    defaultSpaceId,
    defaultSpaceName,
    spaceRoomId,
    spaces,
  ]);
}

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
function formatSpace(r: Space, avatarSrc: string): SpaceData {
  return formatRoom(r, avatarSrc, toChannelGroups(r.children));
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
    membership: r.membership,
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
