import React from "react";
import { Outlet } from "react-router";
import { useSpaceData, useZionContext } from "use-zion-client";
import { Divider, Stack } from "@ui";

export const SpaceMentions = () => {
  const { mentionCounts } = useZionContext();

  const data = useSpaceData();
  if (!data) {
    return null;
  }
  const { channelGroups } = data;

  const channels = Object.entries(mentionCounts)
    .filter(([, count]) => count > 0)
    .map(([channelId]) => channelId)
    .map((channelId) => {
      for (const g of channelGroups) {
        for (const c of g.channels) {
          if (c.id.matrixRoomId === channelId) {
            return c.label;
          }
        }
      }
      return channelId;
    });

  return (
    <Stack grow horizontal>
      <Stack grow>
        <Stack padding gap="md">
          {channels.map((c) => (
            <Divider label={`#${c}`} key={c} />
          ))}
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
