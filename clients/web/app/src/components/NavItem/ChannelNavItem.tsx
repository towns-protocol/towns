import React from "react";
import { useParams } from "react-router";
import { Channel, SpaceData, useZionContext } from "use-zion-client";
import { ButtonText, Icon, TooltipRenderer } from "@ui";
import { ChannelSettingsCard } from "@components/Cards/ChannelSettingsCard";
import { NavItem } from "./_NavItem";

type Props = {
  id: string;
  space: SpaceData;
  channel: Channel;
};

export const ChannelNavItem = (props: Props) => {
  const { channelSlug } = useParams();
  const { unreadCounts, mentionCounts } = useZionContext();
  const { id, space, channel } = props;
  const unreadCount = unreadCounts[channel.id.matrixRoomId];
  const highlightCount = mentionCounts[channel.id.matrixRoomId]; // austin todo move this into channel data?

  const link = `/spaces/${space.id.slug}/channels/${channel.id.slug}/`;
  const isHighlight = channel.id.slug === channelSlug;

  return (
    <TooltipRenderer
      trigger="contextmenu"
      placement="pointer"
      render={
        <ChannelSettingsCard
          spaceId={space.id}
          channelId={channel.id}
          channelName={channel.label}
        />
      }
      layoutId={id}
    >
      {({ triggerProps }) => (
        <NavItem to={link} id={id} {...triggerProps}>
          <Icon
            type="tag"
            padding="line"
            background="level2"
            color="gray2"
            size="square_lg"
          />
          <ButtonText strong={isHighlight || unreadCount > 0}>
            {channel.label.toLocaleLowerCase() +
              (unreadCount > 0 ? " *" : "") +
              (highlightCount > 0 ? " (" + highlightCount + ")" : "")}
          </ButtonText>
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
