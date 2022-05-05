import React from "react";
import { Heading } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { NavItem } from "./_NavItem";

export const ActionNavItem = ({
  compact: isCompact,
  icon,
  id,
  link,
  highlight: isHighlight,
  label,
}: {
  id?: string;
  label: string;
  link?: string;
  icon?: IconName;
  highlight?: boolean;
  compact?: boolean;
}) => {
  return (
    <NavItem compact={isCompact} to={link} id={id}>
      {icon && (
        <Icon
          type={icon}
          padding={isCompact ? "none" : "sm"}
          background={isCompact ? "none" : "level2"}
          color="gray2"
          size={
            isCompact
              ? { desktop: "square_xs", tablet: "square_lg" }
              : { desktop: "square_lg", tablet: "square_lg" }
          }
        />
      )}
      <Heading
        level={5}
        display={{ tablet: "none" }}
        color={isHighlight ? "default" : "gray2"}
      >
        {label}
      </Heading>
    </NavItem>
  );
};
