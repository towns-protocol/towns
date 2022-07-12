import { useMemo } from "react";
import { makeRoomIdentifierFromSlug } from "../types/matrix-types";
import { useSpace } from "./use-space";

export const useChannel = (
  spaceSlug: string | undefined,
  channelSlug: string | undefined,
) => {
  const channelId = channelSlug
    ? makeRoomIdentifierFromSlug(channelSlug)
    : undefined;
  const spaceId = spaceSlug ? makeRoomIdentifierFromSlug(spaceSlug) : undefined;
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
