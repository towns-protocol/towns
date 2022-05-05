import React from "react";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { SideBar } from "@components/SideBars/_SideBar";
import { fakeSpaces } from "data/SpaceData";

export const MainSideBar = () => (
  <SideBar paddingY="sm">
    {navItems.map((n, index) => (
      <ActionNavItem key={n.id} {...n} />
    ))}
    {fakeSpaces.map((m, index) => (
      <SpaceNavItem
        key={m.name}
        active={m.active}
        id={m.id}
        name={m.name}
        avatar={m.avatarSrc}
        pinned={m.pinned}
      />
    ))}
  </SideBar>
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
