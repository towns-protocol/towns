import React from "react";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { SideBar } from "@components/SideBars/_SideBar";
import { useSpaceDataStore } from "store/spaceDataStore";

export const MainSideBar = () => {
  const { spaces } = useSpaceDataStore();

  return (
    <SideBar paddingY="sm">
      {navItems.map((n, index) => (
        <ActionNavItem key={n.id} {...n} />
      ))}
      {spaces.map((m, index) => (
        <SpaceNavItem
          key={m.id}
          active={m.active}
          id={m.id}
          name={m.name}
          avatar={m.avatarSrc}
          pinned={m.pinned}
        />
      ))}
    </SideBar>
  );
};

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  {
    id: "messages",
    link: "/messages/latest",
    icon: "message",
    label: "Messages",
  },
  { id: "spaces/new", link: "/spaces/new", icon: "plus", label: "New Space" },
] as const;
