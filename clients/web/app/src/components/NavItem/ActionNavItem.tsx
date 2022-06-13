import React from "react";
import { ButtonText } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { NavItem } from "./_NavItem";

export const ActionNavItem = ({
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
}) => {
  return (
    <NavItem to={link} id={id}>
      {icon && (
        <Icon
          type={icon}
          padding="sm"
          background="level3"
          color="gray2"
          size={{ desktop: "square_lg", tablet: "square_lg" }}
        />
      )}
      <ButtonText
        display={{ tablet: "none" }}
        color={isHighlight ? "default" : "gray1"}
        strong={isHighlight}
      >
        {label}
      </ButtonText>
    </NavItem>
  );
};
