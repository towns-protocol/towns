import React from "react";
import { useMatch, useResolvedPath } from "react-router-dom";
import { Paragraph } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { NavItem } from "./_NavItem";

export const ActionNavItem = ({
  compact: isCompact,
  icon,
  link,
  id,
  highlight: isHighlight,
  label,
}: {
  id: string;
  label: string;
  link?: string;
  icon?: IconName;
  highlight?: boolean;
  compact?: boolean;
}) => {
  const resolved = useResolvedPath(`/${link === "/" ? "" : link}`);
  const match = useMatch({
    path: resolved.pathname || "/",
    end: link === "/",
  });
  return (
    <NavItem compact={isCompact} to={link}>
      {icon && (
        <Icon
          type={icon}
          background={isCompact ? "none" : match ? "overlay" : "level2"}
          size={
            isCompact
              ? { desktop: "xs", tablet: "lg" }
              : { desktop: "md", tablet: "lg" }
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
