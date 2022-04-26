import React from "react";
import { NavContainer } from "@components/SideBars/_SideBar";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { fakeSpaces } from "data/SpaceData";

export const MainSideBar = () => (
  <NavContainer paddingY="xs">
    {navItems.map((n) => (
      <ActionNavItem key={n.id} {...n} />
    ))}
    {fakeSpaces.map((m) => (
      <SpaceNavItem
        key={m.name}
        active={m.active}
        id={m.id}
        name={m.name}
        avatar={`${m.avatarSrc}`}
        pinned={m.pinned}
      />
    ))}
  </NavContainer>
);

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  {
    id: "messages",
    link: "/messages/latest",
    icon: "message",
    label: "Messages",
  },
  { id: "spaces/new", icon: "plus", label: "New Space" },
] as const;
