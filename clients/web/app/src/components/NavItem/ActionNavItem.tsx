import React from "react";
import { Paragraph } from "@ui";
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
          padding={isCompact ? "none" : "xs"}
          background={isCompact ? "none" : "level2"}
          color="gray2"
          size={
            isCompact
              ? { desktop: "xs", tablet: "lg" }
              : { desktop: "lg", tablet: "lg" }
          }
        />
      )}
      <Paragraph
        display={{ tablet: "none" }}
        fontWeight={isHighlight ? "strong" : "normal"}
      >
        {label}
      </Paragraph>
    </NavItem>
  );
};
