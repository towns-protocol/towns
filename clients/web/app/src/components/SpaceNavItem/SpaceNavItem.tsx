import React from "react";
import { Box, Icon, Paragraph, Text } from "@ui";
import { Avatar } from "ui/components/Avatar/Avatar";
import { NavItem } from "../NavItem/NavItem";

const mock = [
  { name: "Bored Ape Yacht Club", avatar: "nft_10", pinned: true },
  { name: "Crypto Punks", avatar: "nft_14", pinned: true },
  { name: "Doodles", avatar: "nft_41", pinned: true },
  { name: "FWB", avatar: "nft_18" },
  { name: "World of Women", avatar: "nft_26" },
  { name: "Mutant Ape Yacht Club", avatar: "nft_37" },
  { name: "The Sandbox", avatar: "nft_33" },
  { name: "Azuki", avatar: "nft_40" },
  { name: "Clone X - X Takashi Murakami", avatar: "nft_19" },
];

export const SpaceNavMock = () => (
  <>
    {mock.map((m) => (
      <SpaceNavItem
        id={m.avatar}
        key={m.name}
        name={m.name}
        avatar={`/placeholders/${m.avatar}.png`}
        pinned={m.pinned}
      />
    ))}
  </>
);

export const SpaceNavItem = ({
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
  <NavItem>
    <Avatar nft src={avatar} size={{ tablet: "lg", desktop: "md" }} />
    <Box grow direction="row" display={{ tablet: "none" }}>
      <Paragraph fontWeight={active ? "strong" : "normal"}>{name}</Paragraph>
    </Box>
    <Box shrink display={{ tablet: "none" }}>
      {pinned && <Icon type="pin" size="xxs" />}
    </Box>
  </NavItem>
);
