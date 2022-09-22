import React from "react";
import { ButtonText, Stack } from "@ui";
import { Icon, IconName } from "ui/components/Icon";
import { NavItem } from "./_NavItem";

export const ActionNavItem = (props: {
  id?: string;
  badge?: React.ReactNode;
  label: string;
  link?: string;
  icon?: IconName;
  highlight?: boolean;
}) => {
  const { icon, id, link, highlight: isHighlight, label, badge } = props;
  return (
    <NavItem to={link} id={id} highlight={isHighlight}>
      {icon && (
        <Icon
          type={icon}
          padding="line"
          background="level2"
          color="gray2"
          size="square_lg"
        />
      )}
      <ButtonText>{label}</ButtonText>
      <Stack horizontal grow justifyContent="end">
        {badge}
      </Stack>
    </NavItem>
  );
};
