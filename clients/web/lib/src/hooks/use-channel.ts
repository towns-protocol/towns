import { useMemo } from "react";
import { RoomIdentifier, toRoomIdentifier } from "../types/matrix-types";
import { useSpace } from "./use-space";

export const useChannel = (
  spaceSlugOrId: RoomIdentifier | string | undefined,
  channelSlugOrId: RoomIdentifier | string | undefined,
) => {
  const channelId = toRoomIdentifier(channelSlugOrId);
  const spaceId = toRoomIdentifier(spaceSlugOrId);
  const space = useSpace(spaceId?.slug);

  const channelGroup = useMemo(
    () =>
      space?.channelGroups.find((g) =>
        g.channels.find((c) => c.id.slug === channelId?.slug),
      ),
    [space?.channelGroups, channelId?.slug],
  );

  return useMemo(
    () => channelGroup?.channels.find((c) => c.id.slug === channelId?.slug),
    [channelGroup?.channels, channelId?.slug],
  );
};
