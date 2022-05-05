import React from "react";
import { SpaceSummary } from "@components/SpaceBanner/SpaceBanner";
import { Box, Heading, Icon, Paragraph, Stack } from "@ui";
import { fakeSpaceCache } from "data/SpaceData";
import { Avatar } from "ui/components/Avatar/Avatar";
import { Tooltip, TooltipRenderer } from "ui/components/Tooltip/Tooltip";
import { NavItem } from "./_NavItem";

type Props = {
  id: string;
  name: string;
  avatar: string;
  active?: boolean;
  pinned?: boolean;
  exact?: boolean;
  compact?: boolean;
};

const SpaceTooltip = (props: { id: string }) => {
  const { id } = props;
  const { name } = fakeSpaceCache[id];
  return (
    <Tooltip
      horizontal
      id={id}
      key={id}
      gap="sm"
      padding="sm"
      background="default"
      display={{ desktop: "none", tablet: "flex" }}
    >
      <Stack grow justifyContent="center" gap="xs">
        <Heading level={4}>{name}</Heading>
        <SpaceSummary compact />
      </Stack>
    </Tooltip>
  );
};

export const SpaceNavItem = (props: Props) => {
  const { id, active, avatar, exact, name, pinned, compact: isCompact } = props;

  return (
    <TooltipRenderer
      id={props.id}
      placement="horizontal"
      render={<SpaceTooltip id={props.id} />}
    >
      {({ triggerProps }) => (
        <NavItem
          id={id}
          compact={isCompact}
          to={`/spaces/${id}`}
          exact={exact}
          {...triggerProps}
        >
          <Avatar
            animate
            src={avatar}
            size={
              isCompact
                ? { desktop: "sm", tablet: "lg" }
                : { desktop: "lg", tablet: "lg" }
            }
          />
          <Paragraph grow truncate strong={active} display={{ tablet: "none" }}>
            {name}
          </Paragraph>
          <Box shrink display={{ tablet: "none" }}>
            {pinned && <Icon type="pin" size="xxs" />}
          </Box>
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
