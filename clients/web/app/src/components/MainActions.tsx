import { Paragraph } from "@ui";
import { RouteId } from "App";
import React from "react";
import { Icon } from "ui/components/Icon";
import { NavItem } from "./NavItem/NavItem";

const navItems = [
  { id: "home", icon: "home", label: "Home" },
  { id: "messages", icon: "message", label: "Messages" },
  { id: "new", icon: "plus", label: "New Space" },
] as const;

export const MainActions = (props: {
  selectedId: string;
  onSelect: (id: RouteId) => void;
}) => (
  <>
    {navItems.map((n) => (
      <NavItem
        key={n.id}
        onClick={() => props.onSelect(n.id)}
        {...(n.id === props.selectedId
          ? { background: "accent", color: "inverted" }
          : {})}
      >
        <Icon type={n.icon} background="level3" size="sm" />
        <Paragraph>{n.label}</Paragraph>
      </NavItem>
    ))}
  </>
);
