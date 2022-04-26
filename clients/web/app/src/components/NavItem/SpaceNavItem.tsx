import React from "react";
import { Box, Icon, Paragraph } from "@ui";
import { Avatar } from "ui/components/Avatar/Avatar";
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

export const SpaceNavItem = (props: Props) => {
  const { id, active, avatar, exact, name, pinned, compact: isCompact } = props;
  return (
    <NavItem compact={isCompact} to={`/spaces/${id}`} exact={exact}>
      <Avatar
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
  );
};
