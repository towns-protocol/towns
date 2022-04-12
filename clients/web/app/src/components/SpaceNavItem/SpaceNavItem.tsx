import React from "react";
import { NavLink } from "react-router-dom";
import { Box, Icon, Paragraph } from "@ui";
import { Avatar } from "ui/components/Avatar/Avatar";
import { atoms } from "ui/styles/atoms/atoms.css";
import { NavItem } from "../NavItem/NavItem";

export const mockSpaces = [
  {
    id: "bored-ape-yacht-club",
    name: "Bored Ape Yacht Club",
    avatar: "/placeholders/nft_10.png",
    pinned: true,
  },
  {
    id: "crypto-punks",
    name: "Crypto Punks",
    avatar: "/placeholders/nft_14.png",
    pinned: true,
    active: true,
  },
  {
    id: "doodles",
    name: "Doodles",
    avatar: "/placeholders/nft_41.png",
    pinned: true,
  },
  { id: "fwb", name: "FWB", avatar: "/placeholders/nft_18.png" },
  {
    id: "world-of-women",
    name: "World of Women",
    avatar: "/placeholders/nft_26.png",
    active: true,
  },
  {
    id: "mutant-ape-yacht-club",
    name: "Mutant Ape Yacht Club",
    avatar: "/placeholders/nft_37.png",
    active: true,
  },
  {
    id: "the-sandbox",
    name: "The Sandbox",
    avatar: "/placeholders/nft_33.png",
  },
  {
    id: "azuki",
    name: "Azuki",
    avatar: "/placeholders/nft_40.png",
    active: true,
  },
  {
    id: "clone-x",
    name: "Clone X - X Takashi Murakami",
    avatar: "/placeholders/nft_19.png",
  },
];

export const SpaceNavMock = () => (
  <>
    {mockSpaces.map((m) => (
      <SpaceNavItem
        key={m.name}
        active={m.active}
        id={m.id}
        name={m.name}
        avatar={`${m.avatar}`}
        pinned={m.pinned}
      />
    ))}
  </>
);

export const SpaceNavItem = ({
  id,
  active,
  avatar,
  name,
  pinned,
}: {
  id: string;
  name: string;
  avatar: string;
  active?: boolean;
  pinned?: boolean;
}) => (
  <NavLink
    to={`/spaces/${id}`}
    className={({ isActive }) =>
      isActive ? atoms({ background: "accent", color: "onTone" }) : atoms({})
    }
  >
    <NavItem>
      <Avatar src={avatar} size={{ tablet: "lg", desktop: "md" }} />
      <Paragraph
        grow
        truncate
        fontWeight={active ? "strong" : "normal"}
        display={{ tablet: "none" }}
      >
        {name}
      </Paragraph>
      <Box shrink display={{ tablet: "none" }}>
        {pinned && <Icon type="pin" size="xxs" />}
      </Box>
    </NavItem>
  </NavLink>
);
