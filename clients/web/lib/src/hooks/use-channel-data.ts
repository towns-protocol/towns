import { useChannelContext } from "../components/ChannelContextProvider";
import { useMemo } from "react";
import { useSpaceData } from "./use-space-data";
import { ChannelData } from "../types/matrix-types";

export function useChannelData(): ChannelData {
  const { channelId, spaceId } = useChannelContext();
  const space = useSpaceData();

  const channelGroup = useMemo(
    () =>
      space?.channelGroups.find((g) =>
        g.channels.find((c) => c.id.slug === channelId.slug),
      ),
    [space?.channelGroups, channelId.slug],
  );

  const channel = useMemo(
    () => channelGroup?.channels.find((c) => c.id.slug === channelId.slug),
    [channelGroup?.channels, channelId.slug],
  );

  return useMemo(() => {
    return {
      spaceId,
      channelId,
      channel,
    };
  }, [channel, channelId, spaceId]);
}
